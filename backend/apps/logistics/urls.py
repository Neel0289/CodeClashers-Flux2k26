from django.urls import path

from apps.logistics.views import (
    LogisticsRequestAcceptAPIView,
    LogisticsRequestCreateAPIView,
    LogisticsRequestDeclineAPIView,
    LogisticsRequestDeliverAPIView,
    LogisticsRequestDetailAPIView,
    LogisticsRequestListAPIView,
    LogisticsRequestPickupAPIView,
    LogisticsRequestQuoteAPIView,
    LogisticsRouteListCreateAPIView,
    LogisticsPartnersAPIView,
)

urlpatterns = [
    path('partners/', LogisticsPartnersAPIView.as_view(), name='logistics-partners'),
    path('request/', LogisticsRequestCreateAPIView.as_view(), name='logistics-request-create'),
    path('requests/', LogisticsRequestListAPIView.as_view(), name='logistics-request-list'),
    path('requests/<int:pk>/', LogisticsRequestDetailAPIView.as_view(), name='logistics-request-detail'),
    path('requests/<int:pk>/quote/', LogisticsRequestQuoteAPIView.as_view(), name='logistics-request-quote'),
    path('requests/<int:pk>/accept/', LogisticsRequestAcceptAPIView.as_view(), name='logistics-request-accept'),
    path('requests/<int:pk>/decline/', LogisticsRequestDeclineAPIView.as_view(), name='logistics-request-decline'),
    path('requests/<int:pk>/pickup/', LogisticsRequestPickupAPIView.as_view(), name='logistics-request-pickup'),
    path('requests/<int:pk>/deliver/', LogisticsRequestDeliverAPIView.as_view(), name='logistics-request-deliver'),
    path('routes/', LogisticsRouteListCreateAPIView.as_view(), name='logistics-route-list-create'),
]
