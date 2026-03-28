from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.orders.models import Order


class OrderSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    buyer_name = serializers.CharField(source='buyer.first_name', read_only=True)
    farmer_name = serializers.CharField(source='farmer.first_name', read_only=True)
    farmer_city = serializers.CharField(source='farmer.farmer_profile.city', read_only=True)
    farmer_state = serializers.CharField(source='farmer.farmer_profile.state', read_only=True)
    farmer_latitude = serializers.FloatField(source='farmer.farmer_profile.latitude', read_only=True)
    farmer_longitude = serializers.FloatField(source='farmer.farmer_profile.longitude', read_only=True)
    buyer_city = serializers.CharField(source='buyer.buyer_profile.city', read_only=True)
    buyer_state = serializers.CharField(source='buyer.buyer_profile.state', read_only=True)
    buyer_latitude = serializers.FloatField(source='buyer.buyer_profile.latitude', read_only=True)
    buyer_longitude = serializers.FloatField(source='buyer.buyer_profile.longitude', read_only=True)
    payment_status = serializers.SerializerMethodField()
    payment_paid_at = serializers.SerializerMethodField()
    review_deadline_at = serializers.SerializerMethodField()
    buyer_review_submitted = serializers.SerializerMethodField()
    buyer_can_review = serializers.SerializerMethodField()

    def get_payment_status(self, obj):
        if hasattr(obj, 'payment') and obj.payment:
            return obj.payment.status
        return 'pending'

    def get_payment_paid_at(self, obj):
        if hasattr(obj, 'payment') and obj.payment and obj.payment.paid_at:
            return obj.payment.paid_at
        return None

    def get_review_deadline_at(self, obj):
        if obj.status not in {'delivered', 'completed'}:
            return None
        deadline = obj.updated_at + timedelta(days=3)
        return deadline

    def get_buyer_review_submitted(self, obj):
        return obj.reviews.filter(reviewer_id=obj.buyer_id, reviewee_id=obj.farmer_id).exists()

    def get_buyer_can_review(self, obj):
        if obj.status not in {'delivered', 'completed'}:
            return False
        already = obj.reviews.filter(reviewer_id=obj.buyer_id, reviewee_id=obj.farmer_id).exists()
        if already:
            return False
        deadline = obj.updated_at + timedelta(days=3)
        return timezone.now() <= deadline

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ['farmer', 'buyer', 'product', 'negotiation', 'created_at', 'updated_at']
