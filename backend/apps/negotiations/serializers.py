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

    class Meta:
        model = Negotiation
        fields = ['id', 'product', 'buyer', 'farmer', 'quantity', 'status', 'final_price', 'created_at', 'updated_at', 'messages']
        read_only_fields = ['buyer', 'farmer', 'status', 'final_price', 'created_at', 'updated_at']
