from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order
from apps.orders.serializers import OrderSerializer


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
