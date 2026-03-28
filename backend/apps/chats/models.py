from django.core.exceptions import ValidationError
from django.db import models

from apps.orders.models import Order
from apps.users.models import User


class ChatMessage(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages_sent')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages_received')
    text = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['order', 'created_at']),
            models.Index(fields=['receiver', 'is_read']),
        ]

    def clean(self):
        if self.sender_id == self.receiver_id:
            raise ValidationError('Sender and receiver must be different users.')

        participant_ids = {self.order.buyer_id, self.order.farmer_id}
        if self.sender_id not in participant_ids or self.receiver_id not in participant_ids:
            raise ValidationError('Sender and receiver must be participants of the order.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
