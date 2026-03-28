from datetime import date, timedelta
from decimal import Decimal

import requests
from django.conf import settings

from apps.market_prices.models import MarketPrice


MANDI_RESOURCE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070'

MOCK_PRICES = [
    {'commodity': 'Tomato', 'state': 'Gujarat', 'market': 'Ahmedabad', 'min_price': 800, 'max_price': 1400, 'modal_price': 1100},
    {'commodity': 'Onion', 'state': 'Maharashtra', 'market': 'Nashik', 'min_price': 600, 'max_price': 1000, 'modal_price': 800},
    {'commodity': 'Potato', 'state': 'Uttar Pradesh', 'market': 'Agra', 'min_price': 400, 'max_price': 700, 'modal_price': 550},
    {'commodity': 'Wheat', 'state': 'Punjab', 'market': 'Ludhiana', 'min_price': 2100, 'max_price': 2400, 'modal_price': 2250},
    {'commodity': 'Rice', 'state': 'West Bengal', 'market': 'Kolkata', 'min_price': 1800, 'max_price': 2200, 'modal_price': 2000},
    {'commodity': 'Chilli', 'state': 'Andhra Pradesh', 'market': 'Guntur', 'min_price': 5000, 'max_price': 9000, 'modal_price': 7000},
    {'commodity': 'Garlic', 'state': 'Madhya Pradesh', 'market': 'Indore', 'min_price': 2000, 'max_price': 4000, 'modal_price': 3000},
    {'commodity': 'Cauliflower', 'state': 'Haryana', 'market': 'Karnal', 'min_price': 300, 'max_price': 700, 'modal_price': 500},
    {'commodity': 'Brinjal', 'state': 'Karnataka', 'market': 'Bangalore', 'min_price': 400, 'max_price': 900, 'modal_price': 650},
    {'commodity': 'Lemon', 'state': 'Tamil Nadu', 'market': 'Chennai', 'min_price': 1500, 'max_price': 3000, 'modal_price': 2200},
]


def get_mock_prices():
    return [
        {
            **row,
            'variety': row.get('variety', ''),
            'district': row.get('district', ''),
            'unit': 'Quintal',
            'price_date': date.today(),
            'source': 'mock',
            'previous_modal_price': None,
        }
        for row in MOCK_PRICES
    ]


def _to_decimal(value):
    try:
        return Decimal(str(value or 0))
    except Exception:
        return Decimal('0')


def _normalize_record(record):
    return {
        'commodity': str(record.get('commodity') or '').strip(),
        'state': str(record.get('state') or '').strip(),
        'market': str(record.get('market') or '').strip(),
        'variety': str(record.get('variety') or '').strip(),
        'district': str(record.get('district') or '').strip(),
        'min_price': _to_decimal(record.get('min_price')),
        'max_price': _to_decimal(record.get('max_price')),
        'modal_price': _to_decimal(record.get('modal_price')),
    }


def get_previous_modal_price(commodity, state, market, on_date):
    previous_date = on_date - timedelta(days=1)
    previous = MarketPrice.objects.filter(
        commodity__iexact=commodity,
        state__iexact=state,
        market__iexact=market,
        price_date=previous_date,
    ).first()
    if previous:
        return previous.modal_price
    return None


def fetch_market_prices(commodity=None, state=None, limit=100):
    params = {
        'api-key': getattr(settings, 'DATA_GOV_API_KEY', ''),
        'format': 'json',
        'limit': limit,
        'filters[arrival_date]': date.today().strftime('%d/%m/%Y'),
    }
    if commodity:
        params['filters[commodity]'] = commodity
    if state:
        params['filters[state]'] = state

    try:
        response = requests.get(MANDI_RESOURCE_URL, params=params, timeout=10)
        response.raise_for_status()
        payload = response.json()
        records = payload.get('records', [])

        saved = []
        for raw in records:
            normalized = _normalize_record(raw)
            if not normalized['commodity'] or not normalized['state']:
                continue

            obj, _ = MarketPrice.objects.update_or_create(
                commodity=normalized['commodity'],
                state=normalized['state'],
                market=normalized['market'],
                price_date=date.today(),
                defaults={
                    'variety': normalized['variety'],
                    'district': normalized['district'],
                    'min_price': normalized['min_price'],
                    'max_price': normalized['max_price'],
                    'modal_price': normalized['modal_price'],
                    'unit': 'Quintal',
                },
            )
            saved.append(obj)
        return saved
    except Exception:
        return get_mock_prices()


def serialize_price(price):
    if isinstance(price, dict):
        return price

    previous_modal = get_previous_modal_price(price.commodity, price.state, price.market, price.price_date)
    return {
        'id': price.id,
        'commodity': price.commodity,
        'variety': price.variety,
        'state': price.state,
        'district': price.district,
        'market': price.market,
        'min_price': float(price.min_price),
        'max_price': float(price.max_price),
        'modal_price': float(price.modal_price),
        'unit': price.unit,
        'price_date': price.price_date.isoformat(),
        'fetched_at': price.fetched_at.isoformat(),
        'source': 'live',
        'previous_modal_price': float(previous_modal) if previous_modal is not None else None,
    }


def generate_price_suggestion(my_price, modal_price):
    if modal_price <= 0:
        return {
            'verdict': 'UNKNOWN',
            'color': 'gray',
            'suggestion': 'Market modal price is unavailable today. Please check again later.',
            'icon': 'Minus',
        }

    diff_pct = ((my_price - modal_price) / modal_price) * 100
    if diff_pct > 20:
        return {
            'verdict': 'HIGH',
            'color': 'red',
            'suggestion': 'Your price is significantly above market rate. Consider lowering it to attract more buyers.',
            'icon': 'TrendingDown',
        }
    if diff_pct > 5:
        return {
            'verdict': 'SLIGHTLY HIGH',
            'color': 'amber',
            'suggestion': 'Your price is slightly above market. You may still attract buyers if your quality is premium.',
            'icon': 'Minus',
        }
    if diff_pct >= -5:
        return {
            'verdict': 'COMPETITIVE',
            'color': 'green',
            'suggestion': 'Your price is competitive with the market. Good position to attract buyers quickly.',
            'icon': 'TrendingUp',
        }

    return {
        'verdict': 'BELOW MARKET',
        'color': 'green',
        'suggestion': 'Your price is below market rate. Consider raising it — you are likely underselling.',
        'icon': 'TrendingUp',
    }
