from django.urls import path

from apps.alerts.views import SellFastAlertBuyAPIView, SellFastAlertListCreateAPIView

urlpatterns = [
    path('sell-fast/', SellFastAlertListCreateAPIView.as_view(), name='sell-fast-alerts'),
    path('sell-fast/<int:alert_id>/buy/', SellFastAlertBuyAPIView.as_view(), name='sell-fast-alert-buy'),
]
