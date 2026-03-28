from django.urls import path

from apps.chats.views import ChatConversationListAPIView, ChatMessageListCreateAPIView

urlpatterns = [
    path('conversations/', ChatConversationListAPIView.as_view(), name='chat-conversations'),
    path('messages/', ChatMessageListCreateAPIView.as_view(), name='chat-messages'),
]
