from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.products.models import Product
from apps.products.serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
	serializer_class = ProductSerializer

	def get_permissions(self):
		if self.action in ['list', 'retrieve']:
			return [permissions.AllowAny()]
		return [permissions.IsAuthenticated()]

	def get_queryset(self):
		queryset = Product.objects.select_related('farmer').all().order_by('-created_at')

		if self.action == 'list':
			if self.request.user.is_authenticated and self.request.user.role == 'farmer':
				return queryset.filter(farmer=self.request.user)

			queryset = queryset.filter(is_available=True)
			category = self.request.query_params.get('category')
			state = self.request.query_params.get('state')
			min_price = self.request.query_params.get('min_price')
			max_price = self.request.query_params.get('max_price')
			if category:
				queryset = queryset.filter(category=category)
			if state:
				queryset = queryset.filter(state__iexact=state)
			if min_price:
				queryset = queryset.filter(base_price__gte=min_price)
			if max_price:
				queryset = queryset.filter(base_price__lte=max_price)
		elif self.request.user.is_authenticated and self.request.user.role == 'farmer':
			queryset = queryset.filter(farmer=self.request.user)

		return queryset

	def perform_create(self, serializer):
		if self.request.user.role != 'farmer':
			raise permissions.PermissionDenied('Only farmers can create listings.')
		profile = getattr(self.request.user, 'farmer_profile', None)
		state = serializer.validated_data.get('state')
		city = serializer.validated_data.get('city')
		serializer.save(
			farmer=self.request.user,
			state=state or (profile.state if profile else ''),
			city=city or (profile.city if profile else ''),
		)

	def perform_update(self, serializer):
		profile = getattr(self.request.user, 'farmer_profile', None)
		state = serializer.validated_data.get('state')
		city = serializer.validated_data.get('city')
		serializer.save(
			state=state or (profile.state if profile else ''),
			city=city or (profile.city if profile else ''),
		)

	def update(self, request, *args, **kwargs):
		instance = self.get_object()
		if request.user.role != 'farmer' or instance.farmer_id != request.user.id:
			return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
		return super().update(request, *args, **kwargs)

	def destroy(self, request, *args, **kwargs):
		instance = self.get_object()
		if request.user.role != 'farmer' or instance.farmer_id != request.user.id:
			return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
		return super().destroy(request, *args, **kwargs)

	@action(detail=True, methods=['patch'])
	def toggle(self, request, pk=None):
		instance = self.get_object()
		if request.user.role != 'farmer' or instance.farmer_id != request.user.id:
			return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
		instance.is_available = not instance.is_available
		instance.save(update_fields=['is_available'])
		return Response(ProductSerializer(instance).data)

# Create your views here.
