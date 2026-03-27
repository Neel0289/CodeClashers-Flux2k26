from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.logistics.models import LogisticsRequest
from apps.logistics.serializers import LogisticsPartnerSerializer, LogisticsRequestSerializer
from apps.orders.models import Order
from apps.users.models import LogisticsProfile, User


class LogisticsPartnersAPIView(APIView):
	def get(self, request):
		if request.user.role != 'farmer':
			raise PermissionDenied('Only farmers can search partners.')

		pickup_state = request.query_params.get('pickup_state', '')
		drop_state = request.query_params.get('drop_state', '')
		weight = float(request.query_params.get('weight', 0))

		profiles = LogisticsProfile.objects.select_related('user').all()
		filtered = [
			profile for profile in profiles
			if pickup_state in profile.operating_states
			and drop_state in profile.operating_states
			and profile.max_weight_kg >= weight
		]
		return Response(LogisticsPartnerSerializer(filtered, many=True).data)


class LogisticsRequestCreateAPIView(APIView):
	def post(self, request):
		if request.user.role != 'farmer':
			raise PermissionDenied('Only farmers can create requests.')

		order = Order.objects.get(pk=request.data['order_id'])
		if order.farmer_id != request.user.id:
			raise PermissionDenied('Not your order.')

		partner = User.objects.get(pk=request.data['logistics_partner_id'], role='logistics')
		logistics_request = LogisticsRequest.objects.create(
			order=order,
			logistics_partner=partner,
			crop_description=request.data['crop_description'],
			weight_kg=request.data['weight_kg'],
			pickup_state=order.pickup_state,
			pickup_city=order.pickup_city,
			drop_state=order.drop_state,
			drop_city=order.drop_city,
			status='pending',
		)
		return Response(LogisticsRequestSerializer(logistics_request).data, status=status.HTTP_201_CREATED)


class LogisticsRequestListAPIView(APIView):
	def get(self, request):
		if request.user.role == 'logistics':
			queryset = LogisticsRequest.objects.filter(logistics_partner=request.user)
		elif request.user.role == 'farmer':
			queryset = LogisticsRequest.objects.filter(order__farmer=request.user)
		else:
			queryset = LogisticsRequest.objects.none()
		return Response(LogisticsRequestSerializer(queryset.order_by('-created_at'), many=True).data)


class LogisticsRequestDetailAPIView(APIView):
	def get(self, request, pk):
		req = LogisticsRequest.objects.get(pk=pk)
		if request.user.id not in [req.logistics_partner_id, req.order.farmer_id, req.order.buyer_id]:
			raise PermissionDenied('Not allowed.')
		return Response(LogisticsRequestSerializer(req).data)


class LogisticsRequestQuoteAPIView(APIView):
	def post(self, request, pk):
		req = LogisticsRequest.objects.get(pk=pk)
		if request.user.id != req.logistics_partner_id:
			raise PermissionDenied('Only assigned partner can quote.')
		req.quoted_fee = request.data.get('quoted_fee')
		req.status = 'quoted'
		req.save(update_fields=['quoted_fee', 'status'])
		return Response(LogisticsRequestSerializer(req).data)


class LogisticsRequestAcceptAPIView(APIView):
	@transaction.atomic
	def post(self, request, pk):
		req = LogisticsRequest.objects.select_for_update().get(pk=pk)
		if request.user.id != req.order.farmer_id:
			raise PermissionDenied('Only farmer can accept quotes.')

		req.status = 'accepted'
		req.save(update_fields=['status'])

		req.order.status = 'logistics_assigned'
		req.order.save(update_fields=['status', 'updated_at'])

		LogisticsRequest.objects.filter(order=req.order).exclude(pk=req.pk).filter(status__in=['pending', 'quoted']).update(status='cancelled')

		return Response(LogisticsRequestSerializer(req).data)


class LogisticsRequestPickupAPIView(APIView):
	def patch(self, request, pk):
		req = LogisticsRequest.objects.get(pk=pk)
		if request.user.id != req.logistics_partner_id:
			raise PermissionDenied('Not allowed.')
		req.status = 'picked_up'
		req.save(update_fields=['status'])
		req.order.status = 'picked_up'
		req.order.save(update_fields=['status', 'updated_at'])
		return Response(LogisticsRequestSerializer(req).data)


class LogisticsRequestDeliverAPIView(APIView):
	def patch(self, request, pk):
		req = LogisticsRequest.objects.get(pk=pk)
		if request.user.id != req.logistics_partner_id:
			raise PermissionDenied('Not allowed.')
		req.status = 'delivered'
		req.save(update_fields=['status'])
		req.order.status = 'delivered'
		req.order.save(update_fields=['status', 'updated_at'])
		return Response(LogisticsRequestSerializer(req).data)

# Create your views here.
