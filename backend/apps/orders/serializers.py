from rest_framework import serializers

from apps.orders.models import Order


class OrderSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    buyer_name = serializers.CharField(source='buyer.first_name', read_only=True)
    farmer_name = serializers.CharField(source='farmer.first_name', read_only=True)

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ['farmer', 'buyer', 'product', 'negotiation', 'created_at', 'updated_at']
