from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chats.models import ChatMessage
from apps.chats.serializers import ChatMessageSerializer
from apps.orders.models import Order


def _display_name(user):
    full_name = f"{user.first_name} {user.last_name}".strip()
    return full_name or user.username


def _get_participant_order_or_404(user, order_id):
    try:
        order = Order.objects.select_related('buyer', 'farmer', 'product').get(pk=order_id)
    except Order.DoesNotExist:
        return None

    if user.id not in {order.buyer_id, order.farmer_id}:
        raise PermissionDenied('You are not a participant of this order conversation.')
    return order


class ChatConversationListAPIView(APIView):
    def get(self, request):
        user = request.user
        orders = (
            Order.objects
            .filter(Q(buyer=user) | Q(farmer=user))
            .select_related('buyer', 'farmer', 'product')
            .order_by('-updated_at')
        )

        conversations = []
        for order in orders:
            other_user = order.farmer if order.buyer_id == user.id else order.buyer
            last_message = order.chat_messages.select_related('sender').order_by('-created_at').first()
            unread_count = order.chat_messages.filter(receiver=user, is_read=False).count()

            conversations.append({
                'order_id': order.id,
                'order_status': order.status,
                'product_name': order.product.name if order.product_id else 'Order',
                'other_user_id': other_user.id,
                'other_user_name': _display_name(other_user),
                'last_message': last_message.text if last_message else '',
                'last_message_at': last_message.created_at if last_message else order.updated_at,
                'last_message_sender_id': last_message.sender_id if last_message else None,
                'unread_count': unread_count,
            })

        conversations.sort(key=lambda item: item['last_message_at'] or 0, reverse=True)
        return Response(conversations)


class ChatMessageListCreateAPIView(APIView):
    def get(self, request):
        order_id = request.query_params.get('order_id')
        if not order_id:
            return Response({'detail': 'order_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        order = _get_participant_order_or_404(request.user, order_id)
        if order is None:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        messages = ChatMessage.objects.filter(order=order).select_related('sender', 'receiver')

        ChatMessage.objects.filter(order=order, receiver=request.user, is_read=False).update(is_read=True)

        return Response(ChatMessageSerializer(messages, many=True).data)

    def post(self, request):
        order_id = request.data.get('order_id')
        text = str(request.data.get('text') or '').strip()

        if not order_id:
            return Response({'detail': 'order_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not text:
            return Response({'detail': 'Message text is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(text) > 2000:
            return Response({'detail': 'Message is too long.'}, status=status.HTTP_400_BAD_REQUEST)

        order = _get_participant_order_or_404(request.user, order_id)
        if order is None:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        sender = request.user
        receiver = order.farmer if sender.id == order.buyer_id else order.buyer

        message = ChatMessage.objects.create(
            order=order,
            sender=sender,
            receiver=receiver,
            text=text,
        )

        return Response(ChatMessageSerializer(message).data, status=status.HTTP_201_CREATED)
