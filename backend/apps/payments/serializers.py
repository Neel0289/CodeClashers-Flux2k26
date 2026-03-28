from rest_framework import serializers

from apps.payments.models import Payment, Review


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='order.product.name', read_only=True)
    order_quantity = serializers.SerializerMethodField()
    order_value = serializers.SerializerMethodField()

    def get_reviewer_name(self, obj):
        full_name = f"{obj.reviewer.first_name} {obj.reviewer.last_name}".strip()
        return full_name or obj.reviewer.username

    def get_order_quantity(self, obj):
        return obj.order.quantity

    def get_order_value(self, obj):
        return obj.order.agreed_price

    class Meta:
        model = Review
        fields = [
            'id',
            'order',
            'reviewer',
            'reviewee',
            'rating',
            'comment',
            'created_at',
            'reviewer_name',
            'product_name',
            'order_quantity',
            'order_value',
        ]
        read_only_fields = ['reviewer', 'created_at']
