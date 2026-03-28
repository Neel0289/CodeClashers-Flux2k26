import json
import re

from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import BuyerProfile, FarmerProfile, LogisticsProfile, User


INDIAN_VEHICLE_NUMBER_REGEX = re.compile(r'^(?:[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}|\d{2}\s?BH\s?\d{4}\s?[A-Z]{1,2})$')
INDIAN_BANK_ACCOUNT_NUMBER_REGEX = re.compile(r'^\d{9,18}$')
INDIAN_IFSC_REGEX = re.compile(r'^[A-Z]{4}0[A-Z0-9]{6}$')


def build_unique_username(email: str) -> str:
    base_username = email.split('@')[0]
    username = base_username
    count = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{count}"
        count += 1
    return username


def normalize_email_for_lookup(email: str) -> str:
    email = str(email or '').strip().lower()
    if '@' not in email:
        return email

    local_part, domain = email.split('@', 1)
    if domain not in {'gmail.com', 'googlemail.com'}:
        return email

    local_part = local_part.split('+', 1)[0].replace('.', '')
    return f"{local_part}@gmail.com"


def normalize_phone_for_lookup(phone: str) -> str:
    digits = ''.join(char for char in str(phone or '') if char.isdigit())
    if len(digits) >= 10:
        return digits[-10:]
    return digits


def find_user_for_email_login(identifier: str):
    identifier = str(identifier or '').strip()

    # Allow direct phone login for farmer-style auth flows.
    if '@' not in identifier:
        normalized_phone = normalize_phone_for_lookup(identifier)
        if normalized_phone:
            # Prefer exact phone match first.
            user = User.objects.filter(phone=normalized_phone).first()
            if user:
                return user

            # Fallback for stored phone values like +91XXXXXXXXXX.
            phone_candidates = User.objects.exclude(phone='').values_list('id', 'phone')
            for user_id, phone in phone_candidates:
                if normalize_phone_for_lookup(phone) == normalized_phone:
                    return User.objects.filter(id=user_id).first()

    user = User.objects.filter(email__iexact=identifier).first()
    if user:
        return user

    normalized = normalize_email_for_lookup(identifier)
    if normalized.endswith('@gmail.com'):
        gmail_candidates = User.objects.filter(email__iendswith='@gmail.com')
        googlemail_candidates = User.objects.filter(email__iendswith='@googlemail.com')
        for candidate in list(gmail_candidates) + list(googlemail_candidates):
            if normalize_email_for_lookup(candidate.email) == normalized:
                return candidate

    return None


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
    vehicles = serializers.JSONField(required=False)
    bank_account_number = serializers.CharField(required=False, allow_blank=True)
    bank_ifsc = serializers.CharField(required=False, allow_blank=True)

    # Missing fields from models but used in RegisterPage
    aadhaar_number = serializers.CharField(required=False, allow_blank=True)
    bank_account_holder = serializers.CharField(required=False, allow_blank=True)
    bank_account_number = serializers.CharField(required=False, allow_blank=True)
    bank_ifsc = serializers.CharField(required=False, allow_blank=True)
    bank_name = serializers.CharField(required=False, allow_blank=True)
    bank_branch = serializers.CharField(required=False, allow_blank=True)
    passbook_photo_file = serializers.ImageField(required=False, allow_null=True)

    farmer_photo_file = serializers.ImageField(required=False, allow_null=True)
    village = serializers.CharField(required=False, allow_blank=True)
    taluka = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    certificates = serializers.CharField(required=False, allow_blank=True)

    buyer_photo_file = serializers.ImageField(required=False, allow_null=True)
    district = serializers.CharField(required=False, allow_blank=True)

    logistics_photo_file = serializers.ImageField(required=False, allow_null=True)

    def validate(self, attrs):
        attrs['email'] = attrs['email'].strip().lower()
        if User.objects.filter(email__iexact=attrs['email']).exists():
            raise serializers.ValidationError({'email': 'An account with this email already exists.'})

        role = attrs['role']

        bank_account_number = str(attrs.get('bank_account_number', '') or '').strip()
        bank_ifsc = str(attrs.get('bank_ifsc', '') or '').strip().upper()

        if not INDIAN_BANK_ACCOUNT_NUMBER_REGEX.match(bank_account_number):
            raise serializers.ValidationError({'bank_account_number': 'Enter a valid Indian bank account number (9 to 18 digits).'})

        if len(bank_ifsc) != 11:
            raise serializers.ValidationError({'bank_ifsc': 'IFSC code must be exactly 11 characters.'})

        if not re.match(r'^[A-Z]{4}', bank_ifsc):
            raise serializers.ValidationError({'bank_ifsc': 'IFSC code must start with 4 alphabetic characters (e.g., SBIN).'})

        if bank_ifsc[4] != '0':
            raise serializers.ValidationError({'bank_ifsc': 'The 5th character in IFSC code must be 0.'})

        if not INDIAN_IFSC_REGEX.match(bank_ifsc):
            raise serializers.ValidationError({'bank_ifsc': 'Enter a valid IFSC code (format: ABCD0XXXXXX).'})

        attrs['bank_account_number'] = bank_account_number
        attrs['bank_ifsc'] = bank_ifsc

        if role == 'logistics':
            vehicles = attrs.get('vehicles')

            if isinstance(vehicles, str):
                try:
                    vehicles = json.loads(vehicles)
                except json.JSONDecodeError as exc:
                    raise serializers.ValidationError({'vehicles': 'Invalid vehicles JSON payload.'}) from exc

            if not isinstance(vehicles, list) or not vehicles:
                raise serializers.ValidationError({'vehicles': 'At least one vehicle is required for logistics registration.'})

            normalized_vehicles = []
            merged_operating_states = []

            for idx, vehicle in enumerate(vehicles, start=1):
                if not isinstance(vehicle, dict):
                    raise serializers.ValidationError({'vehicles': f'Vehicle {idx} must be an object.'})

                vehicle_type = str(vehicle.get('vehicle_type', '')).strip().lower()
                vehicle_number = str(vehicle.get('vehicle_number', '')).strip().upper()
                max_weight_capacity = vehicle.get('max_weight_capacity')
                operating_states = vehicle.get('operating_states', [])

                if vehicle_type not in {'bike', 'tempo', 'truck'}:
                    raise serializers.ValidationError({'vehicles': f'Vehicle {idx} type must be bike, tempo, or truck.'})

                if isinstance(operating_states, str):
                    operating_states = [s.strip() for s in operating_states.split(',') if s.strip()]

                if not isinstance(operating_states, list) or not operating_states:
                    raise serializers.ValidationError({'vehicles': f'Vehicle {idx} operating states are required.'})

                try:
                    max_weight_capacity = float(max_weight_capacity)
                except (TypeError, ValueError) as exc:
                    raise serializers.ValidationError({'vehicles': f'Vehicle {idx} max capacity must be a number.'}) from exc

                if max_weight_capacity <= 0:
                    raise serializers.ValidationError({'vehicles': f'Vehicle {idx} max capacity must be greater than 0.'})

                if not INDIAN_VEHICLE_NUMBER_REGEX.match(vehicle_number):
                    raise serializers.ValidationError({'vehicles': f'Vehicle {idx} number is invalid. Use Indian format like MH12AB1234.'})

                normalized_vehicle = {
                    'vehicle_type': vehicle_type,
                    'vehicle_number': vehicle_number,
                    'max_weight_capacity': max_weight_capacity,
                    'operating_states': operating_states,
                }
                normalized_vehicles.append(normalized_vehicle)
                merged_operating_states.extend(operating_states)

            attrs['vehicles'] = normalized_vehicles
            attrs['vehicle_type'] = normalized_vehicles[0]['vehicle_type']
            attrs['max_weight_capacity'] = normalized_vehicles[0]['max_weight_capacity']
            attrs['operating_states'] = sorted(set(merged_operating_states))

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
            aadhaar_number=validated_data.get('aadhaar_number', ''),
            bank_account_holder=validated_data.get('bank_account_holder', ''),
            bank_account_number=validated_data.get('bank_account_number', ''),
            bank_ifsc=validated_data.get('bank_ifsc', ''),
            bank_name=validated_data.get('bank_name', ''),
            bank_branch=validated_data.get('bank_branch', ''),
            passbook_photo=validated_data.get('passbook_photo_file'),
        )

        user.set_password(password)
        user.save(update_fields=['password'])

        if user.role == 'farmer':
            certs_raw = validated_data.get('certificates', '[]')
            try:
                certs = json.loads(certs_raw) if isinstance(certs_raw, str) else certs_raw
            except:
                certs = []
            FarmerProfile.objects.create(
                user=user,
                farm_name=validated_data.get('farm_name', ''),
                state=validated_data.get('farm_state', ''),
                city=validated_data.get('farm_city', ''),
                village=validated_data.get('village', ''),
                taluka=validated_data.get('taluka', ''),
                address=validated_data.get('address', ''),
                latitude=validated_data.get('farm_latitude'),
                longitude=validated_data.get('farm_longitude'),
                certificates=certs,
                photo=validated_data.get('farmer_photo_file'),
            )
        elif user.role == 'buyer':
            BuyerProfile.objects.create(
                user=user,
                business_name=validated_data.get('business_name', ''),
                business_type=validated_data.get('business_type', 'buyer'),
                state=validated_data.get('state', ''),
                city=validated_data.get('city', ''),
                district=validated_data.get('district', ''),
                address=validated_data.get('address', ''),
                latitude=validated_data.get('buyer_latitude'),
                longitude=validated_data.get('buyer_longitude'),
                photo=validated_data.get('buyer_photo_file'),
            )
        elif user.role == 'logistics':
            LogisticsProfile.objects.create(
                user=user,
                vehicle_type=validated_data.get('vehicle_type', 'truck'),
                max_weight_kg=validated_data.get('max_weight_capacity', 0),
                operating_states=validated_data.get('operating_states', []),
                vehicles=validated_data.get('vehicles', []),
                photo=validated_data.get('logistics_photo_file'),
            )

        return user


def get_token_payload(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = str(attrs['email'] or '').strip()
        password = attrs['password']
        user = find_user_for_email_login(identifier)
        if not user:
            raise serializers.ValidationError('Invalid credentials.')

        if not user.is_active:
            raise serializers.ValidationError('This account is inactive.')

        if not user.has_usable_password():
            raise serializers.ValidationError('This account has no password set. Use Google Sign in.')

        if not user.check_password(password):
            raise serializers.ValidationError('Invalid credentials.')

        attrs['user'] = user
        return attrs


class FarmerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmerProfile
        fields = ['farm_name', 'state', 'city', 'village', 'taluka', 'address', 'certificates', 'photo', 'latitude', 'longitude']


class BuyerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerProfile
        fields = ['business_name', 'business_type', 'state', 'city', 'district', 'address', 'photo', 'latitude', 'longitude']


class LogisticsProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogisticsProfile
        fields = ['vehicle_type', 'max_weight_kg', 'operating_states', 'vehicles', 'photo', 'rating', 'total_deliveries']


class UserProfileSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'email', 'phone', 'role', 'profile_complete', 'profile',
            'aadhaar_number', 'bank_account_holder', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch', 'passbook_photo'
        ]

    def get_profile(self, obj):
        if obj.role == 'farmer' and hasattr(obj, 'farmer_profile'):
            return FarmerProfileSerializer(obj.farmer_profile).data
        if obj.role == 'buyer' and hasattr(obj, 'buyer_profile'):
            return BuyerProfileSerializer(obj.buyer_profile).data
        if obj.role == 'logistics' and hasattr(obj, 'logistics_profile'):
            return LogisticsProfileSerializer(obj.logistics_profile).data
        return {}
