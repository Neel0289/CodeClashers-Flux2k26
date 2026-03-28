from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.alerts.models import SellFastAlert
from apps.alerts.serializers import SellFastAlertSerializer
from apps.negotiations.models import Negotiation, NegotiationMessage
from apps.orders.models import Order
from apps.orders.serializers import OrderSerializer
from apps.products.models import Product


class SellFastAlertListCreateAPIView(APIView):
    def get(self, request):
        user = request.user

        if user.role == 'farmer':
            queryset = SellFastAlert.objects.filter(farmer=user)
        else:
            cutoff = timezone.now() - timedelta(hours=48)
            queryset = SellFastAlert.objects.filter(is_active=True, created_at__gte=cutoff)

        return Response(SellFastAlertSerializer(queryset, many=True).data)

    def post(self, request):
        if request.user.role != 'farmer':
            raise PermissionDenied('Only farmers can send Sell Fast alerts.')

        serializer = SellFastAlertSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        alert = serializer.save()
        return Response(SellFastAlertSerializer(alert).data, status=status.HTTP_201_CREATED)


class SellFastAlertBuyAPIView(APIView):
    @transaction.atomic
    def post(self, request, alert_id):
        if request.user.role != 'buyer':
            raise PermissionDenied('Only buyers can purchase from Sell Fast alerts.')

        try:
            alert = SellFastAlert.objects.select_for_update().get(pk=alert_id, is_active=True)
        except SellFastAlert.DoesNotExist:
            return Response({'detail': 'Alert not found or no longer active.'}, status=status.HTTP_404_NOT_FOUND)

        quantity_raw = request.data.get('quantity')
        if quantity_raw in [None, '']:
            return Response({'detail': 'quantity is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quantity = float(quantity_raw)
        except (TypeError, ValueError):
            return Response({'detail': 'Quantity must be a valid number.'}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0:
            return Response({'detail': 'Quantity must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

        alert_available_qty = float(alert.quantity_kg or 0)
        if quantity > alert_available_qty:
            return Response({'detail': f'Only {alert_available_qty} kg is available in this alert.'}, status=status.HTTP_400_BAD_REQUEST)

        if not alert.product_id:
            return Response({'detail': 'This alert cannot be purchased directly because no product is linked.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.select_for_update().get(pk=alert.product_id, is_available=True)
        except Product.DoesNotExist:
            return Response({'detail': 'Linked product is unavailable.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.id == product.farmer_id:
            return Response({'detail': 'You cannot place an order on your own product.'}, status=status.HTTP_400_BAD_REQUEST)

        product_available_qty = float(product.quantity_available or 0)
        if quantity > product_available_qty:
            return Response({'detail': f'Only {product_available_qty} kg is available in listing stock.'}, status=status.HTTP_400_BAD_REQUEST)

        fixed_price_per_kg = Decimal(str(alert.price_per_kg if alert.price_per_kg is not None else product.base_price))
        total_price = (fixed_price_per_kg * Decimal(str(quantity))).quantize(Decimal('0.01'))

        negotiation = Negotiation.objects.create(
            product=product,
            buyer=request.user,
            farmer=product.farmer,
            quantity=quantity,
            status='accepted',
            final_price=total_price,
        )
        NegotiationMessage.objects.create(
            negotiation=negotiation,
            sender=request.user,
            offered_price=total_price,
            message='Direct purchase from Sell Fast alert.',
            action='accept',
        )

        order = Order.objects.create(
            negotiation=negotiation,
            farmer=product.farmer,
            buyer=request.user,
            product=product,
            emergency_alert=alert,
            is_emergency_order=True,
            quantity=quantity,
            agreed_price=total_price,
            status='confirmed',
        )

        remaining_product_qty = product_available_qty - quantity
        product.quantity_available = max(remaining_product_qty, 0)
        if remaining_product_qty <= 0:
            product.is_available = False
            product.save(update_fields=['quantity_available', 'is_available'])
        else:
            product.save(update_fields=['quantity_available'])

        remaining_alert_qty = alert_available_qty - quantity
        alert.quantity_kg = max(remaining_alert_qty, 0)
        if remaining_alert_qty <= 0:
            alert.is_active = False
            alert.save(update_fields=['quantity_kg', 'is_active'])
        else:
            alert.save(update_fields=['quantity_kg'])

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
