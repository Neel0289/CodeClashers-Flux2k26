from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.logistics.models import LogisticsRequest
from apps.orders.models import Order
from apps.payments.models import Payment, Review
from apps.payments.serializers import PaymentSerializer, ReviewSerializer
from apps.users.models import LogisticsProfile


class PaymentPayAPIView(APIView):
	def post(self, request, order_id):
		order = Order.objects.get(pk=order_id)
		if request.user.id != order.buyer_id:
			raise PermissionDenied('Only buyer can pay.')

		accepted_req = LogisticsRequest.objects.filter(order=order, status='accepted').first()
		logistics_fee = Decimal(str(accepted_req.quoted_fee if accepted_req and accepted_req.quoted_fee else 0))
		produce_amount = Decimal(str(order.agreed_price)) * Decimal(str(order.quantity))
		platform_fee = (produce_amount * Decimal('0.02')).quantize(Decimal('0.01'))
		total_amount = produce_amount + logistics_fee + platform_fee

		payment, _ = Payment.objects.update_or_create(
			order=order,
			defaults={
				'buyer': request.user,
				'produce_amount': produce_amount,
				'logistics_fee': logistics_fee,
				'platform_fee': platform_fee,
				'total_amount': total_amount,
				'status': 'escrow',
				'paid_at': timezone.now(),
			},
		)
		return Response(PaymentSerializer(payment).data)


class PaymentReleaseAPIView(APIView):
	def post(self, request, order_id):
		order = Order.objects.get(pk=order_id)
		if request.user.id != order.buyer_id:
			raise PermissionDenied('Only buyer can release payment.')
		if order.status != 'delivered':
			return Response({'detail': 'Order must be delivered first.'}, status=status.HTTP_400_BAD_REQUEST)

		payment = Payment.objects.get(order=order)
		payment.status = 'released'
		payment.released_at = timezone.now()
		payment.save(update_fields=['status', 'released_at'])

		order.status = 'completed'
		order.save(update_fields=['status', 'updated_at'])

		accepted_req = LogisticsRequest.objects.filter(order=order, status='accepted').first()
		if accepted_req:
			profile = LogisticsProfile.objects.filter(user=accepted_req.logistics_partner).first()
			if profile:
				profile.total_deliveries += 1
				profile.save(update_fields=['total_deliveries'])

		return Response(PaymentSerializer(payment).data)


class PaymentDetailAPIView(APIView):
	def get(self, request, order_id):
		order = Order.objects.get(pk=order_id)
		if request.user.id not in [order.buyer_id, order.farmer_id] and request.user.role != 'logistics':
			raise PermissionDenied('Not allowed.')
		payment = Payment.objects.get(order=order)
		return Response(PaymentSerializer(payment).data)


class ReviewListCreateAPIView(APIView):
	def get(self, request):
		user_id = request.query_params.get('user_id')
		queryset = Review.objects.filter(reviewee_id=user_id).order_by('-created_at')
		return Response(ReviewSerializer(queryset, many=True).data)

	def post(self, request):
		order = Order.objects.get(pk=request.data['order_id'])
		if order.status != 'completed':
			return Response({'detail': 'Reviews are allowed only after completion.'}, status=status.HTTP_400_BAD_REQUEST)
		if request.user.id not in [order.buyer_id, order.farmer_id]:
			raise PermissionDenied('Not allowed.')

		serializer = ReviewSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save(reviewer=request.user)
		return Response(serializer.data, status=status.HTTP_201_CREATED)

# Create your views here.
