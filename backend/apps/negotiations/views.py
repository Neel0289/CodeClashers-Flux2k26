from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.negotiations.models import Negotiation, NegotiationMessage
from apps.negotiations.serializers import NegotiationSerializer
from apps.orders.models import Order
from apps.products.models import Product


class NegotiationListCreateAPIView(APIView):
	def get(self, request):
		user = request.user
		if user.role == 'buyer':
			queryset = Negotiation.objects.filter(buyer=user)
		elif user.role == 'farmer':
			queryset = Negotiation.objects.filter(farmer=user)
		else:
			queryset = Negotiation.objects.none()
		data = NegotiationSerializer(queryset.order_by('-updated_at'), many=True).data
		return Response(data)

	@transaction.atomic
	def post(self, request):
		if request.user.role != 'buyer':
			raise PermissionDenied('Only buyers can create negotiations.')

		product = Product.objects.get(pk=request.data['product'])
		negotiation = Negotiation.objects.create(
			product=product,
			buyer=request.user,
			farmer=product.farmer,
			quantity=request.data['quantity'],
			status='open',
		)
		NegotiationMessage.objects.create(
			negotiation=negotiation,
			sender=request.user,
			offered_price=request.data['offered_price'],
			message=request.data.get('message', ''),
			action='offer',
		)
		return Response(NegotiationSerializer(negotiation).data, status=status.HTTP_201_CREATED)


class NegotiationDetailAPIView(APIView):
	def get(self, request, pk):
		negotiation = Negotiation.objects.get(pk=pk)
		if request.user.id not in [negotiation.farmer_id, negotiation.buyer_id]:
			raise PermissionDenied('Not allowed to view this negotiation.')
		return Response(NegotiationSerializer(negotiation).data)


class NegotiationRespondAPIView(APIView):
	@transaction.atomic
	def post(self, request, pk):
		negotiation = Negotiation.objects.get(pk=pk)
		if request.user.id not in [negotiation.farmer_id, negotiation.buyer_id]:
			raise PermissionDenied('Not allowed to respond to this negotiation.')

		action = request.data.get('action')
		offered_price = request.data.get('offered_price')
		message = request.data.get('message', '')
		if action not in ['counter', 'accept', 'reject']:
			return Response({'detail': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)

		if action in ['counter', 'accept'] and not offered_price:
			return Response({'detail': 'offered_price is required.'}, status=status.HTTP_400_BAD_REQUEST)

		msg_action = 'counter' if action == 'counter' else action
		NegotiationMessage.objects.create(
			negotiation=negotiation,
			sender=request.user,
			offered_price=offered_price or 0,
			message=message,
			action=msg_action,
		)

		if action == 'reject':
			negotiation.status = 'rejected'
			negotiation.save(update_fields=['status', 'updated_at'])
		elif action == 'counter':
			negotiation.status = 'countered'
			negotiation.save(update_fields=['status', 'updated_at'])
		else:
			negotiation.status = 'accepted'
			negotiation.final_price = offered_price
			negotiation.save(update_fields=['status', 'final_price', 'updated_at'])
			Order.objects.get_or_create(
				negotiation=negotiation,
				defaults={
					'farmer': negotiation.farmer,
					'buyer': negotiation.buyer,
					'product': negotiation.product,
					'quantity': negotiation.quantity,
					'agreed_price': offered_price,
					'status': 'confirmed',
				},
			)

		return Response(NegotiationSerializer(negotiation).data)

# Create your views here.
