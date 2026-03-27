from rest_framework import serializers

from apps.logistics.models import LogisticsRequest
from apps.users.models import LogisticsProfile


class LogisticsPartnerSerializer(serializers.ModelSerializer):
    partner_name = serializers.CharField(source='user.first_name', read_only=True)

    class Meta:
        model = LogisticsProfile
        fields = ['id', 'partner_name', 'vehicle_type', 'max_weight_kg', 'operating_states', 'rating', 'total_deliveries']


class LogisticsRequestSerializer(serializers.ModelSerializer):
    logistics_partner_name = serializers.CharField(source='logistics_partner.first_name', read_only=True)

    class Meta:
        model = LogisticsRequest
        fields = '__all__'
        read_only_fields = ['status', 'quoted_fee', 'created_at']
