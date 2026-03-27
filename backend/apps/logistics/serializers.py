from rest_framework import serializers

from apps.logistics.models import LogisticsRequest, LogisticsRoute
from apps.users.models import LogisticsProfile


class LogisticsPartnerSerializer(serializers.ModelSerializer):
    partner_name = serializers.CharField(source='user.first_name', read_only=True)
    logistics_partner_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = LogisticsProfile
        fields = ['id', 'logistics_partner_id', 'partner_name', 'vehicle_type', 'max_weight_kg', 'operating_states', 'rating', 'total_deliveries']


class LogisticsRequestSerializer(serializers.ModelSerializer):
    logistics_partner_name = serializers.CharField(source='logistics_partner.first_name', read_only=True)
    farmer_name = serializers.CharField(source='order.farmer.first_name', read_only=True)
    farmer_phone = serializers.CharField(source='order.farmer.phone', read_only=True)
    buyer_name = serializers.CharField(source='order.buyer.first_name', read_only=True)
    product_name = serializers.CharField(source='order.product.name', read_only=True)
    order_quantity = serializers.FloatField(source='order.quantity', read_only=True)
    order_agreed_price = serializers.DecimalField(source='order.agreed_price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = LogisticsRequest
        fields = '__all__'
        read_only_fields = ['status', 'quoted_fee', 'created_at']


class LogisticsRouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogisticsRoute
        fields = '__all__'
        read_only_fields = ['logistics_partner', 'created_at']
