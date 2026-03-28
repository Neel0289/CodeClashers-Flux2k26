from datetime import date

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.market_prices.models import MarketPrice
from apps.market_prices.services import (
    fetch_market_prices,
    generate_price_suggestion,
    serialize_price,
)
from apps.market_prices.ai_service import generate_farmer_ai_reply
from apps.market_prices.weather_service import get_tomorrow_weather


class MarketPriceListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        commodity = request.query_params.get('commodity')
        state = request.query_params.get('state')

        queryset = MarketPrice.objects.filter(price_date=date.today())
        if commodity:
            queryset = queryset.filter(commodity__iexact=commodity)
        if state:
            queryset = queryset.filter(state__iexact=state)

        if not queryset.exists():
            fetched = fetch_market_prices(commodity=commodity, state=state)
            if fetched and isinstance(fetched[0], dict):
                return Response({'results': fetched, 'source': 'mock'})

            queryset = MarketPrice.objects.filter(price_date=date.today())
            if commodity:
                queryset = queryset.filter(commodity__iexact=commodity)
            if state:
                queryset = queryset.filter(state__iexact=state)

        return Response({'results': [serialize_price(price) for price in queryset.order_by('commodity', 'market')], 'source': 'live'})


class CommodityListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today_commodities = list(
            MarketPrice.objects.filter(price_date=date.today())
            .values_list('commodity', flat=True)
            .distinct()
            .order_by('commodity')
        )
        if today_commodities:
            return Response({'commodities': today_commodities})

        fetched = fetch_market_prices()
        if fetched and isinstance(fetched[0], dict):
            names = sorted({str(row.get('commodity', '')).strip() for row in fetched if row.get('commodity')})
            return Response({'commodities': names})

        names = list(
            MarketPrice.objects.filter(price_date=date.today())
            .values_list('commodity', flat=True)
            .distinct()
            .order_by('commodity')
        )
        return Response({'commodities': names})


class PriceCompareAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        commodity = request.query_params.get('commodity')
        state = request.query_params.get('state')
        my_price_raw = request.query_params.get('my_price')

        if not commodity or my_price_raw in [None, '']:
            return Response({'detail': 'commodity and my_price are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            my_price = float(my_price_raw)
        except ValueError:
            return Response({'detail': 'my_price must be numeric.'}, status=status.HTTP_400_BAD_REQUEST)

        if my_price <= 0:
            return Response({'detail': 'my_price must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

        if not state and request.user.role == 'farmer' and hasattr(request.user, 'farmer_profile'):
            state = request.user.farmer_profile.state

        queryset = MarketPrice.objects.filter(price_date=date.today(), commodity__iexact=commodity)
        if state:
            queryset = queryset.filter(state__iexact=state)

        if not queryset.exists():
            fetched = fetch_market_prices(commodity=commodity, state=state)
            if fetched and isinstance(fetched[0], dict):
                modal_price = float(fetched[0].get('modal_price') or 0)
                market_state = fetched[0].get('state', state or '')
                market_name = fetched[0].get('market', '')
            else:
                queryset = MarketPrice.objects.filter(price_date=date.today(), commodity__iexact=commodity)
                if state:
                    queryset = queryset.filter(state__iexact=state)
                if not queryset.exists():
                    return Response({'detail': 'No market data found for this commodity today.'}, status=status.HTTP_404_NOT_FOUND)
                modal_price = float(sum(row.modal_price for row in queryset) / queryset.count())
                market_state = state or ''
                market_name = ''
        else:
            modal_price = float(sum(row.modal_price for row in queryset) / queryset.count())
            market_state = state or queryset.first().state
            market_name = queryset.first().market

        difference = my_price - modal_price
        difference_pct = (difference / modal_price * 100) if modal_price > 0 else 0
        verdict = generate_price_suggestion(my_price=my_price, modal_price=modal_price)

        return Response(
            {
                'commodity': commodity,
                'state': market_state,
                'market': market_name,
                'market_modal': round(modal_price, 2),
                'your_price': round(my_price, 2),
                'difference': round(difference, 2),
                'difference_pct': round(difference_pct, 2),
                'verdict': verdict,
            }
        )


class TomorrowWeatherAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'farmer' or not hasattr(request.user, 'farmer_profile'):
            return Response({'detail': 'Only farmers can access weather intelligence.'}, status=status.HTTP_403_FORBIDDEN)

        city = request.user.farmer_profile.city
        state = request.user.farmer_profile.state
        if not city or not state:
            return Response({'detail': 'Farmer profile city and state are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            weather = get_tomorrow_weather(city=city, state=state)
        except Exception:
            weather = None

        if not weather:
            return Response({'detail': 'Could not fetch tomorrow weather right now.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(
            {
                'city': city,
                'state': state,
                **weather,
            }
        )


class FarmerAssistantChatAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'farmer' or not hasattr(request.user, 'farmer_profile'):
            return Response({'detail': 'Only farmers can use assistant chat.'}, status=status.HTTP_403_FORBIDDEN)

        message = str(request.data.get('message', '')).strip()
        history = request.data.get('history') or []
        if not message:
            return Response({'detail': 'message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = generate_farmer_ai_reply(
                user=request.user,
                message=message,
                history=history if isinstance(history, list) else [],
            )
            return Response(result)
        except Exception:
            return Response(
                {
                    'reply': 'I am facing a temporary issue fetching advanced insights. You can still use Market Intelligence to compare crop prices and weather before deciding your next crop.',
                    'source': 'fallback',
                }
            )
