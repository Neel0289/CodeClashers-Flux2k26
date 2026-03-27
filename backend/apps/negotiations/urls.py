from django.urls import path

from apps.negotiations.views import NegotiationDetailAPIView, NegotiationListCreateAPIView, NegotiationRespondAPIView

urlpatterns = [
    path('', NegotiationListCreateAPIView.as_view(), name='negotiation-list-create'),
    path('<int:pk>/', NegotiationDetailAPIView.as_view(), name='negotiation-detail'),
    path('<int:pk>/respond/', NegotiationRespondAPIView.as_view(), name='negotiation-respond'),
]
