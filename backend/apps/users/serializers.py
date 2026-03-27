from django.contrib.auth import authenticate
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import BuyerProfile, FarmerProfile, LogisticsProfile, User


def build_unique_username(email: str) -> str:
    base_username = email.split('@')[0]
    username = base_username
    count = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{count}"
        count += 1
    return username


class RegisterSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=15)
    password = serializers.CharField(write_only=True, min_length=6)

    farm_name = serializers.CharField(required=False)
    farm_state = serializers.CharField(required=False)
    farm_city = serializers.CharField(required=False)
    farm_latitude = serializers.FloatField(required=False)
    farm_longitude = serializers.FloatField(required=False)

    business_name = serializers.CharField(required=False)
    business_type = serializers.ChoiceField(choices=[('restaurant', 'Restaurant'), ('store', 'Store')], required=False)
    state = serializers.CharField(required=False)
    city = serializers.CharField(required=False)
    buyer_latitude = serializers.FloatField(required=False)
    buyer_longitude = serializers.FloatField(required=False)

    vehicle_type = serializers.ChoiceField(choices=[('bike', 'Bike'), ('tempo', 'Tempo'), ('truck', 'Truck')], required=False)
    max_weight_capacity = serializers.FloatField(required=False)
    operating_states = serializers.ListField(child=serializers.CharField(), required=False)

    def validate(self, attrs):
        attrs['email'] = attrs['email'].strip().lower()
        if User.objects.filter(email__iexact=attrs['email']).exists():
            raise serializers.ValidationError({'email': 'An account with this email already exists.'})

        role = attrs['role']
        required_map = {
            'farmer': ['farm_name', 'farm_state', 'farm_city', 'farm_latitude', 'farm_longitude'],
            'buyer': ['business_name', 'business_type', 'state', 'city', 'buyer_latitude', 'buyer_longitude'],
            'logistics': ['vehicle_type', 'max_weight_capacity', 'operating_states'],
        }
        for field in required_map.get(role, []):
            if field not in attrs or attrs[field] in [None, '', []]:
                raise serializers.ValidationError({field: 'This field is required for the selected role.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop('password')

        user = User.objects.create(
            username=build_unique_username(validated_data['email']),
            first_name=validated_data['name'],
            email=validated_data['email'],
            phone=validated_data['phone'],
            role=validated_data['role'],
            profile_complete=True,
        )

        user.set_password(password)
        user.save(update_fields=['password'])

        if user.role == 'farmer':
            FarmerProfile.objects.create(
                user=user,
                farm_name=validated_data['farm_name'],
                state=validated_data['farm_state'],
                city=validated_data['farm_city'],
                latitude=validated_data['farm_latitude'],
                longitude=validated_data['farm_longitude'],
            )
        elif user.role == 'buyer':
            BuyerProfile.objects.create(
                user=user,
                business_name=validated_data['business_name'],
                business_type=validated_data['business_type'],
                state=validated_data['state'],
                city=validated_data['city'],
                latitude=validated_data['buyer_latitude'],
                longitude=validated_data['buyer_longitude'],
            )
        elif user.role == 'logistics':
            LogisticsProfile.objects.create(
                user=user,
                vehicle_type=validated_data['vehicle_type'],
                max_weight_kg=validated_data['max_weight_capacity'],
                operating_states=validated_data['operating_states'],
            )

        return user


def get_token_payload(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs['email'].strip().lower()
        password = attrs['password']
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise serializers.ValidationError('Invalid credentials.')

        authed = authenticate(username=user.username, password=password)
        if not authed:
            raise serializers.ValidationError('Invalid credentials.')

        attrs['user'] = authed
        return attrs


class FarmerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmerProfile
        fields = ['farm_name', 'state', 'city', 'latitude', 'longitude']


class BuyerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerProfile
        fields = ['business_name', 'business_type', 'state', 'city', 'latitude', 'longitude']


class LogisticsProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogisticsProfile
        fields = ['vehicle_type', 'max_weight_kg', 'operating_states', 'rating', 'total_deliveries']


class UserProfileSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'first_name', 'email', 'phone', 'role', 'profile_complete', 'profile']

    def get_profile(self, obj):
        if obj.role == 'farmer' and hasattr(obj, 'farmer_profile'):
            return FarmerProfileSerializer(obj.farmer_profile).data
        if obj.role == 'buyer' and hasattr(obj, 'buyer_profile'):
            return BuyerProfileSerializer(obj.buyer_profile).data
        if obj.role == 'logistics' and hasattr(obj, 'logistics_profile'):
            return LogisticsProfileSerializer(obj.logistics_profile).data
        return {}
