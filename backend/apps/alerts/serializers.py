from rest_framework import serializers

from apps.alerts.models import SellFastAlert
from apps.products.models import Product


class SellFastAlertSerializer(serializers.ModelSerializer):
    farmer_name = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    farmer_phone = serializers.CharField(source='farmer.phone', read_only=True)

    def get_farmer_name(self, obj):
        full_name = f"{obj.farmer.first_name} {obj.farmer.last_name}".strip()
        return full_name or obj.farmer.username

    def get_product_name(self, obj):
        if obj.product_id and obj.product:
            return obj.product.name
        return 'Mixed Crops'

    def validate(self, attrs):
        request = self.context.get('request')
        farmer = request.user if request else None
        product = attrs.get('product')

        if product and farmer and product.farmer_id != farmer.id:
            raise serializers.ValidationError('You can only create alerts for your own listing.')
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        return SellFastAlert.objects.create(farmer=request.user, **validated_data)

    class Meta:
        model = SellFastAlert
        fields = [
            'id',
            'farmer',
            'farmer_name',
            'farmer_phone',
            'product',
            'product_name',
            'quantity_kg',
            'price_per_kg',
            'note',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'farmer', 'farmer_name', 'farmer_phone', 'product_name', 'created_at']
