from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.firebase_auth import verify_firebase_id_token
from apps.users.serializers import (
	BuyerProfileSerializer,
	FarmerProfileSerializer,
	LogisticsProfileSerializer,
	LoginSerializer,
	RegisterSerializer,
	UserProfileSerializer,
	get_token_payload,
)
from apps.users.models import User


def normalize_email_for_google_lookup(email: str) -> str:
	email = str(email or '').strip().lower()
	if '@' not in email:
		return email

	local_part, domain = email.split('@', 1)
	if domain not in {'gmail.com', 'googlemail.com'}:
		return email

	# Gmail ignores dots and anything after '+' in the local part.
	local_part = local_part.split('+', 1)[0].replace('.', '')
	return f'{local_part}@gmail.com'


def find_user_for_google_email(email: str):
	normalized = normalize_email_for_google_lookup(email)

	# First, try exact email match for all providers.
	user = User.objects.filter(email__iexact=email).first()
	if user:
		return user

	# For Gmail addresses, also match canonical aliases.
	if normalized.endswith('@gmail.com'):
		gmail_candidates = User.objects.filter(email__iendswith='@gmail.com')
		googlemail_candidates = User.objects.filter(email__iendswith='@googlemail.com')
		for candidate in list(gmail_candidates) + list(googlemail_candidates):
			if normalize_email_for_google_lookup(candidate.email) == normalized:
				return candidate

	return None


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


class GoogleLoginAPIView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		id_token = request.data.get('id_token')
		if not id_token:
			return Response({'detail': 'id_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

		try:
			decoded = verify_firebase_id_token(id_token)
		except Exception:
			return Response({'detail': 'Invalid Google token.'}, status=status.HTTP_400_BAD_REQUEST)

		email = str(decoded.get('email', '')).strip().lower()
		if not email:
			return Response({'detail': 'Google account email not found.'}, status=status.HTTP_400_BAD_REQUEST)

		user = find_user_for_google_email(email)
		if not user:
			return Response(
				{
					'detail': 'No account exists for this Google email. Please sign up first.',
					'google_email': email,
				},
				status=status.HTTP_404_NOT_FOUND,
			)

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
