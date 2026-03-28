from rest_framework import serializers

from apps.products.models import Product


class ProductSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.first_name', read_only=True)
    farmer_latitude = serializers.FloatField(source='farmer.farmer_profile.latitude', read_only=True)
    farmer_longitude = serializers.FloatField(source='farmer.farmer_profile.longitude', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['farmer', 'created_at']

    def validate_quantity_available(self, value):
        quantity = float(value or 0)
        if quantity < 0:
            raise serializers.ValidationError('Quantity cannot be negative.')
        return value
