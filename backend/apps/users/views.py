from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.serializers import (
	BuyerProfileSerializer,
	FarmerProfileSerializer,
	LogisticsProfileSerializer,
	LoginSerializer,
	RegisterSerializer,
	UserProfileSerializer,
	get_token_payload,
)


class RegisterAPIView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		serializer = RegisterSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()
		return Response({'user': UserProfileSerializer(user).data, **get_token_payload(user)}, status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		serializer = LoginSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.validated_data['user']
		return Response({'user': UserProfileSerializer(user).data, **get_token_payload(user)})


class ProfileAPIView(APIView):
	def get(self, request):
		return Response(UserProfileSerializer(request.user).data)

	def put(self, request):
		user = request.user
		user.first_name = request.data.get('name', user.first_name)
		user.phone = request.data.get('phone', user.phone)
		user.save(update_fields=['first_name', 'phone'])

		if user.role == 'farmer' and hasattr(user, 'farmer_profile'):
			serializer = FarmerProfileSerializer(user.farmer_profile, data=request.data, partial=True)
			serializer.is_valid(raise_exception=True)
			serializer.save()
		elif user.role == 'buyer' and hasattr(user, 'buyer_profile'):
			serializer = BuyerProfileSerializer(user.buyer_profile, data=request.data, partial=True)
			serializer.is_valid(raise_exception=True)
			serializer.save()
		elif user.role == 'logistics' and hasattr(user, 'logistics_profile'):
			serializer = LogisticsProfileSerializer(user.logistics_profile, data=request.data, partial=True)
			serializer.is_valid(raise_exception=True)
			serializer.save()

		return Response(UserProfileSerializer(user).data)

# Create your views here.
