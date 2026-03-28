from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.orders.models import Order


class OrderSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    buyer_name = serializers.CharField(source='buyer.first_name', read_only=True)
    farmer_name = serializers.CharField(source='farmer.first_name', read_only=True)
    farmer_city = serializers.SerializerMethodField()
    farmer_state = serializers.SerializerMethodField()
    farmer_latitude = serializers.SerializerMethodField()
    farmer_longitude = serializers.SerializerMethodField()
    buyer_city = serializers.SerializerMethodField()
    buyer_state = serializers.SerializerMethodField()
    buyer_latitude = serializers.SerializerMethodField()
    buyer_longitude = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    payment_paid_at = serializers.SerializerMethodField()
    review_deadline_at = serializers.SerializerMethodField()
    buyer_review_submitted = serializers.SerializerMethodField()
    buyer_can_review = serializers.SerializerMethodField()
    buyer_logistics_review_submitted = serializers.SerializerMethodField()
    buyer_can_review_logistics = serializers.SerializerMethodField()
    farmer_logistics_review_submitted = serializers.SerializerMethodField()
    farmer_can_review_logistics = serializers.SerializerMethodField()

    @staticmethod
    def _get_farmer_profile(obj):
        return getattr(obj.farmer, 'farmer_profile', None)

    @staticmethod
    def _get_buyer_profile(obj):
        return getattr(obj.buyer, 'buyer_profile', None)

    def get_farmer_city(self, obj):
        profile = self._get_farmer_profile(obj)
        return profile.city if profile else None

    def get_farmer_state(self, obj):
        profile = self._get_farmer_profile(obj)
        return profile.state if profile else None

    def get_farmer_latitude(self, obj):
        profile = self._get_farmer_profile(obj)
        return profile.latitude if profile else None

    def get_farmer_longitude(self, obj):
        profile = self._get_farmer_profile(obj)
        return profile.longitude if profile else None

    def get_buyer_city(self, obj):
        profile = self._get_buyer_profile(obj)
        return profile.city if profile else None

    def get_buyer_state(self, obj):
        profile = self._get_buyer_profile(obj)
        return profile.state if profile else None

    def get_buyer_latitude(self, obj):
        profile = self._get_buyer_profile(obj)
        return profile.latitude if profile else None

    def get_buyer_longitude(self, obj):
        profile = self._get_buyer_profile(obj)
        return profile.longitude if profile else None

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

    @staticmethod
    def _get_review_deadline(obj):
        if obj.status not in {'delivered', 'completed'}:
            return None
        return obj.updated_at + timedelta(days=3)

    @staticmethod
    def _get_logistics_partner_id_for_review(obj):
        logistics_request = (
            obj.logistics_requests
            .filter(status__in=['accepted', 'picked_up', 'delivered'])
            .order_by('-created_at')
            .first()
        )
        if not logistics_request:
            return None
        return logistics_request.logistics_partner_id

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

    def get_buyer_logistics_review_submitted(self, obj):
        logistics_partner_id = self._get_logistics_partner_id_for_review(obj)
        if not logistics_partner_id:
            return False
        return obj.reviews.filter(reviewer_id=obj.buyer_id, reviewee_id=logistics_partner_id).exists()

    def get_buyer_can_review_logistics(self, obj):
        deadline = self._get_review_deadline(obj)
        if not deadline or timezone.now() > deadline:
            return False
        logistics_partner_id = self._get_logistics_partner_id_for_review(obj)
        if not logistics_partner_id:
            return False
        already = obj.reviews.filter(reviewer_id=obj.buyer_id, reviewee_id=logistics_partner_id).exists()
        return not already

    def get_farmer_logistics_review_submitted(self, obj):
        logistics_partner_id = self._get_logistics_partner_id_for_review(obj)
        if not logistics_partner_id:
            return False
        return obj.reviews.filter(reviewer_id=obj.farmer_id, reviewee_id=logistics_partner_id).exists()

    def get_farmer_can_review_logistics(self, obj):
        deadline = self._get_review_deadline(obj)
        if not deadline or timezone.now() > deadline:
            return False
        logistics_partner_id = self._get_logistics_partner_id_for_review(obj)
        if not logistics_partner_id:
            return False
        already = obj.reviews.filter(reviewer_id=obj.farmer_id, reviewee_id=logistics_partner_id).exists()
        return not already

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ['farmer', 'buyer', 'product', 'negotiation', 'created_at', 'updated_at']
