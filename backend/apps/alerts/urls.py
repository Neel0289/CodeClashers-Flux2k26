from django.urls import path

from apps.alerts.views import SellFastAlertListCreateAPIView

urlpatterns = [
    path('sell-fast/', SellFastAlertListCreateAPIView.as_view(), name='sell-fast-alerts'),
]
