from rest_framework import serializers

from apps.products.models import Product


class ProductSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.first_name', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['farmer', 'created_at']
