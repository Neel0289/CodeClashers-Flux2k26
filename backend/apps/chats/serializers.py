from rest_framework import serializers

from apps.chats.models import ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()

    def get_sender_name(self, obj):
        full_name = f"{obj.sender.first_name} {obj.sender.last_name}".strip()
        return full_name or obj.sender.username

    def get_receiver_name(self, obj):
        full_name = f"{obj.receiver.first_name} {obj.receiver.last_name}".strip()
        return full_name or obj.receiver.username

    class Meta:
        model = ChatMessage
        fields = [
            'id',
            'order',
            'sender',
            'receiver',
            'sender_name',
            'receiver_name',
            'text',
            'is_read',
            'created_at',
        ]
        read_only_fields = ['id', 'sender', 'receiver', 'sender_name', 'receiver_name', 'is_read', 'created_at']
