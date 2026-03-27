from decimal import Decimal

import razorpay
from django.conf import settings
from django.db import transaction
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


def get_razorpay_client():
	return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


class PaymentPayAPIView(APIView):
	def post(self, request, order_id):
		order = Order.objects.get(pk=order_id)
		if request.user.id != order.buyer_id:
			raise PermissionDenied('Only buyer can pay.')

		accepted_req = LogisticsRequest.objects.filter(order=order, status='accepted').first()
		logistics_fee = Decimal(str(accepted_req.quoted_fee if accepted_req and accepted_req.quoted_fee else 0))
		produce_amount = Decimal(str(order.agreed_price))
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


class BuyerOrderCheckoutCreateAPIView(APIView):
	def post(self, request, order_id):
		order = Order.objects.get(pk=order_id)
		if request.user.id != order.buyer_id:
			raise PermissionDenied('Only buyer can initiate payment for this order.')

		existing = Payment.objects.filter(order=order).first()
		if existing and existing.status in ['escrow', 'released']:
			return Response({'detail': 'This order is already paid.'}, status=status.HTTP_400_BAD_REQUEST)

		amount = Decimal(str(order.agreed_price)).quantize(Decimal('0.01'))
		if amount <= 0:
			return Response({'detail': 'Order amount must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

		amount_paise = int(amount * Decimal('100'))
		client = get_razorpay_client()
		razor_order = client.order.create({
			'amount': amount_paise,
			'currency': 'INR',
			'receipt': f'order-{order.id}-{int(timezone.now().timestamp())}',
			'notes': {
				'order_id': str(order.id),
				'buyer_id': str(order.buyer_id),
			},
		})

		return Response({
			'key': settings.RAZORPAY_KEY_ID,
			'amount': amount_paise,
			'currency': 'INR',
			'razorpay_order_id': razor_order.get('id'),
			'description': f'Payment for Order #{order.id}',
			'name': 'KhetBazaar',
			'prefill': {
				'name': request.user.first_name,
				'email': request.user.email,
				'contact': request.user.phone,
			},
			'theme': {'color': '#15803d'},
		})


class BuyerOrderCheckoutVerifyAPIView(APIView):
	@transaction.atomic
	def post(self, request, order_id):
		order = Order.objects.select_for_update().get(pk=order_id)
		if request.user.id != order.buyer_id:
			raise PermissionDenied('Only buyer can verify payment for this order.')

		razorpay_order_id = request.data.get('razorpay_order_id')
		razorpay_payment_id = request.data.get('razorpay_payment_id')
		razorpay_signature = request.data.get('razorpay_signature')
		if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
			return Response({'detail': 'Missing Razorpay payment verification fields.'}, status=status.HTTP_400_BAD_REQUEST)

		client = get_razorpay_client()
		try:
			client.utility.verify_payment_signature({
				'razorpay_order_id': razorpay_order_id,
				'razorpay_payment_id': razorpay_payment_id,
				'razorpay_signature': razorpay_signature,
			})
		except Exception:
			return Response({'detail': 'Payment verification failed.'}, status=status.HTTP_400_BAD_REQUEST)

		produce_amount = Decimal(str(order.agreed_price)).quantize(Decimal('0.01'))
		payment, _ = Payment.objects.update_or_create(
			order=order,
			defaults={
				'buyer': request.user,
				'produce_amount': produce_amount,
				'logistics_fee': Decimal('0.00'),
				'platform_fee': Decimal('0.00'),
				'total_amount': produce_amount,
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


class LogisticsQuoteCheckoutCreateAPIView(APIView):
	def post(self, request, request_id):
		logistics_request = LogisticsRequest.objects.select_related('order').get(pk=request_id)
		if request.user.id != logistics_request.order.farmer_id:
			raise PermissionDenied('Only farmer can initiate payment for logistics quote.')
		if logistics_request.status != 'quoted':
			return Response({'detail': 'Payment can be initiated only for quoted requests.'}, status=status.HTTP_400_BAD_REQUEST)

		fee = Decimal(str(logistics_request.quoted_fee or 0)).quantize(Decimal('0.01'))
		if fee <= 0:
			return Response({'detail': 'Quoted amount must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

		amount_paise = int(fee * Decimal('100'))
		client = get_razorpay_client()
		razor_order = client.order.create({
			'amount': amount_paise,
			'currency': 'INR',
			'receipt': f'logreq-{logistics_request.id}-{int(timezone.now().timestamp())}',
			'notes': {
				'logistics_request_id': str(logistics_request.id),
				'order_id': str(logistics_request.order_id),
			},
		})

		return Response({
			'key': settings.RAZORPAY_KEY_ID,
			'amount': amount_paise,
			'currency': 'INR',
			'razorpay_order_id': razor_order.get('id'),
			'description': f'Logistics service payment for Order #{logistics_request.order_id}',
			'name': 'KhetBazaar (Demo)',
			'prefill': {
				'name': request.user.first_name,
				'email': request.user.email,
				'contact': request.user.phone,
			},
			'theme': {'color': '#15803d'},
		})


class LogisticsQuoteCheckoutVerifyAPIView(APIView):
	@transaction.atomic
	def post(self, request, request_id):
		logistics_request = LogisticsRequest.objects.select_for_update().select_related('order').get(pk=request_id)
		if request.user.id != logistics_request.order.farmer_id:
			raise PermissionDenied('Only farmer can verify payment for logistics quote.')
		if logistics_request.status != 'quoted':
			return Response({'detail': 'Only quoted requests can be paid and accepted.'}, status=status.HTTP_400_BAD_REQUEST)

		razorpay_order_id = request.data.get('razorpay_order_id')
		razorpay_payment_id = request.data.get('razorpay_payment_id')
		razorpay_signature = request.data.get('razorpay_signature')
		if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
			return Response({'detail': 'Missing Razorpay payment verification fields.'}, status=status.HTTP_400_BAD_REQUEST)

		client = get_razorpay_client()
		try:
			client.utility.verify_payment_signature({
				'razorpay_order_id': razorpay_order_id,
				'razorpay_payment_id': razorpay_payment_id,
				'razorpay_signature': razorpay_signature,
			})
		except Exception:
			return Response({'detail': 'Payment verification failed.'}, status=status.HTTP_400_BAD_REQUEST)

		logistics_request.status = 'accepted'
		logistics_request.save(update_fields=['status'])

		logistics_request.order.status = 'logistics_assigned'
		logistics_request.order.save(update_fields=['status', 'updated_at'])

		LogisticsRequest.objects.filter(order=logistics_request.order).exclude(pk=logistics_request.pk).filter(status__in=['pending', 'quoted']).update(status='cancelled')

		return Response({'detail': 'Payment verified. Logistics quote accepted successfully.'})

# Create your views here.
