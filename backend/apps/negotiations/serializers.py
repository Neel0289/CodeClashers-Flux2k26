from rest_framework import serializers

from apps.negotiations.models import Negotiation, NegotiationMessage


class NegotiationMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.first_name', read_only=True)

    class Meta:
        model = NegotiationMessage
        fields = ['id', 'sender', 'sender_name', 'offered_price', 'message', 'action', 'timestamp']
        read_only_fields = ['sender', 'timestamp']


class NegotiationSerializer(serializers.ModelSerializer):
    messages = NegotiationMessageSerializer(many=True, read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    buyer_name = serializers.CharField(source='buyer.first_name', read_only=True)
    farmer_name = serializers.CharField(source='farmer.first_name', read_only=True)
    latest_offered_price = serializers.SerializerMethodField()

    def get_latest_offered_price(self, obj):
        last_message = obj.messages.order_by('-timestamp').first()
        return last_message.offered_price if last_message else None

    class Meta:
        model = Negotiation
        fields = ['id', 'product', 'product_name', 'buyer', 'buyer_name', 'farmer', 'farmer_name', 'quantity', 'status', 'final_price', 'latest_offered_price', 'created_at', 'updated_at', 'messages']
        read_only_fields = ['buyer', 'farmer', 'status', 'final_price', 'created_at', 'updated_at']
