from decimal import Decimal

from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.negotiations.models import Negotiation, NegotiationMessage
from apps.orders.models import Order
from apps.orders.serializers import OrderSerializer
from apps.products.models import Product


class OrderListAPIView(APIView):
	def get(self, request):
		if request.user.role == 'farmer':
			queryset = Order.objects.filter(farmer=request.user)
		elif request.user.role == 'buyer':
			queryset = Order.objects.filter(buyer=request.user)
		elif request.user.role == 'logistics':
			queryset = Order.objects.filter(logistics_requests__logistics_partner=request.user).distinct()
		else:
			queryset = Order.objects.none()
		return Response(OrderSerializer(queryset.order_by('-created_at'), many=True).data)

	@transaction.atomic
	def post(self, request):
		if request.user.role != 'buyer':
			raise PermissionDenied('Only buyers can place orders.')

		product_id = request.data.get('product')
		quantity_raw = request.data.get('quantity')
		if not product_id or quantity_raw in [None, '']:
			return Response({'detail': 'product and quantity are required.'}, status=status.HTTP_400_BAD_REQUEST)

		try:
			quantity = float(quantity_raw)
		except (TypeError, ValueError):
			return Response({'detail': 'Quantity must be a valid number.'}, status=status.HTTP_400_BAD_REQUEST)

		if quantity <= 0:
			return Response({'detail': 'Quantity must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

		try:
			product = Product.objects.select_for_update().get(pk=product_id, is_available=True)
		except Product.DoesNotExist:
			return Response({'detail': 'Product not found or unavailable.'}, status=status.HTTP_404_NOT_FOUND)

		if request.user.id == product.farmer_id:
			return Response({'detail': 'You cannot place an order on your own product.'}, status=status.HTTP_400_BAD_REQUEST)

		available_qty = float(product.quantity_available or 0)
		if quantity > available_qty:
			return Response({'detail': f'Only {available_qty} kg is available.'}, status=status.HTTP_400_BAD_REQUEST)

		total_price = Decimal(str(product.base_price)) * Decimal(str(quantity))

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
			message='Direct order placed from map.',
			action='accept',
		)

		order = Order.objects.create(
			negotiation=negotiation,
			farmer=product.farmer,
			buyer=request.user,
			product=product,
			quantity=quantity,
			agreed_price=total_price,
			status='confirmed',
		)

		remaining = available_qty - quantity
		product.quantity_available = remaining
		if remaining <= 0:
			product.quantity_available = 0
			product.is_available = False
			product.save(update_fields=['quantity_available', 'is_available'])
		else:
			product.save(update_fields=['quantity_available'])

		return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailAPIView(APIView):
	def get(self, request, pk):
		order = Order.objects.get(pk=pk)
		allowed = [order.farmer_id, order.buyer_id]
		if request.user.role == 'logistics':
			allowed.append(request.user.id)
		if request.user.id not in allowed:
			raise PermissionDenied('Not allowed.')
		return Response(OrderSerializer(order).data)


class OrderSetLocationsAPIView(APIView):
	def post(self, request, pk):
		order = Order.objects.get(pk=pk)
		if request.user.id != order.farmer_id:
			raise PermissionDenied('Only the farmer can set locations.')

		order.pickup_state = request.data.get('pickup_state', '')
		order.pickup_city = request.data.get('pickup_city', '')
		order.drop_state = request.data.get('drop_state', '')
		order.drop_city = request.data.get('drop_city', '')
		order.status = 'logistics_pending'
		order.save()
		return Response(OrderSerializer(order).data)


class OrderStatusAPIView(APIView):
	def patch(self, request, pk):
		order = Order.objects.get(pk=pk)
		if request.user.id not in [order.farmer_id, order.buyer_id]:
			raise PermissionDenied('Not allowed.')
		next_status = request.data.get('status')
		if next_status not in dict(Order.STATUS):
			return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)
		order.status = next_status
		order.save(update_fields=['status', 'updated_at'])
		return Response(OrderSerializer(order).data)

# Create your views here.
