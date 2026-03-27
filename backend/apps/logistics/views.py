from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.logistics.models import LogisticsRequest, LogisticsRoute
from apps.logistics.serializers import LogisticsPartnerSerializer, LogisticsRequestSerializer, LogisticsRouteSerializer
from apps.orders.models import Order
from apps.users.models import LogisticsProfile, User


class LogisticsPartnersAPIView(APIView):
	def get(self, request):
		if request.user.role != 'farmer':
			raise PermissionDenied('Only farmers can search partners.')

		pickup_state = request.query_params.get('pickup_state', '')
		drop_state = request.query_params.get('drop_state', '')
		weight_raw = request.query_params.get('weight', '')
		try:
			weight = float(weight_raw) if str(weight_raw).strip() else None
		except (TypeError, ValueError):
			weight = None

		profiles = LogisticsProfile.objects.select_related('user').filter(user__is_active=True)
		filtered = [
			profile for profile in profiles
			if (not pickup_state or pickup_state in profile.operating_states)
			and (not drop_state or drop_state in profile.operating_states)
			and (weight is None or profile.max_weight_kg >= weight)
		]
		return Response(LogisticsPartnerSerializer(filtered, many=True).data)


class LogisticsRequestCreateAPIView(APIView):
	def post(self, request):
		if request.user.role != 'farmer':
			raise PermissionDenied('Only farmers can create requests.')

		order = Order.objects.select_related(
			'farmer__farmer_profile',
			'buyer__buyer_profile',
		).get(pk=request.data['order_id'])
		if order.farmer_id != request.user.id:
			raise PermissionDenied('Not your order.')

		pickup_state = str(order.pickup_state or '').strip()
		pickup_city = str(order.pickup_city or '').strip()
		drop_state = str(order.drop_state or '').strip()
		drop_city = str(order.drop_city or '').strip()

		if (not pickup_state or not pickup_city) and hasattr(order.farmer, 'farmer_profile'):
			pickup_state = str(order.farmer.farmer_profile.state or '').strip()
			pickup_city = str(order.farmer.farmer_profile.city or '').strip()
		if (not drop_state or not drop_city) and hasattr(order.buyer, 'buyer_profile'):
			drop_state = str(order.buyer.buyer_profile.state or '').strip()
			drop_city = str(order.buyer.buyer_profile.city or '').strip()

		if (pickup_state and pickup_city and drop_state and drop_city) and (
			order.pickup_state != pickup_state
			or order.pickup_city != pickup_city
			or order.drop_state != drop_state
			or order.drop_city != drop_city
		):
			order.pickup_state = pickup_state
			order.pickup_city = pickup_city
			order.drop_state = drop_state
			order.drop_city = drop_city
			if order.status in ['confirmed', 'logistics_pending']:
				order.status = 'logistics_pending'
			order.save(update_fields=['pickup_state', 'pickup_city', 'drop_state', 'drop_city', 'status', 'updated_at'])

		if not order.pickup_state or not order.drop_state:
			return Response({'detail': 'Pickup and drop locations are required before requesting logistics.'}, status=status.HTTP_400_BAD_REQUEST)

		weight = float(request.data.get('weight_kg') or order.quantity or 0)
		pickup_state = str(order.pickup_state or '').strip()
		drop_state = str(order.drop_state or '').strip()

		profiles = LogisticsProfile.objects.select_related('user').filter(
			user__is_active=True,
			max_weight_kg__gte=weight,
		)

		partners_with_routes = set(
			LogisticsRoute.objects.values_list('logistics_partner_id', flat=True).distinct()
		)
		matching_route_partner_ids = set(
			LogisticsRoute.objects.filter(
				Q(start_state__iexact=pickup_state, end_state__iexact=drop_state)
				| Q(start_state__iexact=drop_state, end_state__iexact=pickup_state)
			).values_list('logistics_partner_id', flat=True)
		)

		matching_profiles = []
		for profile in profiles:
			if profile.user_id in matching_route_partner_ids:
				matching_profiles.append(profile)
				continue

			# Fallback for logistics users who have not added explicit map routes yet.
			if profile.user_id not in partners_with_routes:
				operating_states = [str(state).strip().lower() for state in (profile.operating_states or [])]
				if pickup_state.lower() in operating_states and drop_state.lower() in operating_states:
					matching_profiles.append(profile)

		if not matching_profiles:
			return Response({'detail': 'No logistics partners available for this route and quantity.'}, status=status.HTTP_400_BAD_REQUEST)

		selected_partner_id = request.data.get('logistics_partner_id')
		if selected_partner_id not in [None, '']:
			try:
				selected_partner_id = int(selected_partner_id)
			except (TypeError, ValueError):
				return Response({'detail': 'Invalid logistics partner selected.'}, status=status.HTTP_400_BAD_REQUEST)

			matching_profiles = [profile for profile in matching_profiles if profile.user_id == selected_partner_id]
			if not matching_profiles:
				return Response({'detail': 'Selected logistics partner is not available for this route.'}, status=status.HTTP_400_BAD_REQUEST)

		LogisticsRequest.objects.filter(order=order, status__in=['pending', 'quoted']).delete()

		created_requests = []
		for profile in matching_profiles:
			created_requests.append(
				LogisticsRequest.objects.create(
					order=order,
					logistics_partner=profile.user,
					crop_description=request.data['crop_description'],
					weight_kg=weight,
					pickup_state=order.pickup_state,
					pickup_city=order.pickup_city,
					drop_state=order.drop_state,
					drop_city=order.drop_city,
					status='pending',
				)
			)

		return Response(LogisticsRequestSerializer(created_requests, many=True).data, status=status.HTTP_201_CREATED)


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
		if req.status not in ['pending', 'quoted']:
			return Response({'detail': 'Quote can only be updated for pending requests.'}, status=status.HTTP_400_BAD_REQUEST)
		req.quoted_fee = request.data.get('quoted_fee')
		req.status = 'quoted'
		req.save(update_fields=['quoted_fee', 'status'])
		return Response(LogisticsRequestSerializer(req).data)


class LogisticsRequestAcceptAPIView(APIView):
	@transaction.atomic
	def post(self, request, pk):
		req = LogisticsRequest.objects.select_for_update().get(pk=pk)
		if request.user.id != req.order.farmer_id:
			raise PermissionDenied('Only farmer can accept logistics quotes.')
		if req.status != 'quoted':
			return Response({'detail': 'Only quoted requests can be accepted.'}, status=status.HTTP_400_BAD_REQUEST)

		req.status = 'accepted'
		req.save(update_fields=['status'])

		req.order.status = 'logistics_assigned'
		req.order.save(update_fields=['status', 'updated_at'])

		LogisticsRequest.objects.filter(order=req.order).exclude(pk=req.pk).filter(status__in=['pending', 'quoted']).update(status='cancelled')

		return Response(LogisticsRequestSerializer(req).data)


class LogisticsRequestDeclineAPIView(APIView):
	def post(self, request, pk):
		req = LogisticsRequest.objects.get(pk=pk)
		if request.user.id != req.order.farmer_id:
			raise PermissionDenied('Only farmer can decline logistics quotes.')
		if req.status not in ['pending', 'quoted']:
			return Response({'detail': 'This request cannot be declined.'}, status=status.HTTP_400_BAD_REQUEST)

		req.status = 'cancelled'
		req.save(update_fields=['status'])

		if req.order.status == 'logistics_assigned':
			req.order.status = 'logistics_pending'
			req.order.save(update_fields=['status', 'updated_at'])

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


class LogisticsRouteListCreateAPIView(APIView):
	def get(self, request):
		if request.user.role != 'logistics':
			raise PermissionDenied('Only logistics users can manage routes.')
		queryset = LogisticsRoute.objects.filter(logistics_partner=request.user).order_by('-created_at')
		return Response(LogisticsRouteSerializer(queryset, many=True).data)

	def post(self, request):
		if request.user.role != 'logistics':
			raise PermissionDenied('Only logistics users can create routes.')

		serializer = LogisticsRouteSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		logistics_route = serializer.save(logistics_partner=request.user)

		if hasattr(request.user, 'logistics_profile'):
			profile = request.user.logistics_profile
			merged_states = set(profile.operating_states or [])
			if logistics_route.start_state:
				merged_states.add(logistics_route.start_state)
			if logistics_route.end_state:
				merged_states.add(logistics_route.end_state)
			profile.operating_states = sorted(merged_states)
			profile.save(update_fields=['operating_states'])

		return Response(LogisticsRouteSerializer(logistics_route).data, status=status.HTTP_201_CREATED)

# Create your views here.
