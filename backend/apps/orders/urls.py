from django.urls import path

from apps.orders.views import OrderDetailAPIView, OrderListAPIView, OrderSetLocationsAPIView, OrderStatusAPIView

urlpatterns = [
    path('', OrderListAPIView.as_view(), name='order-list'),
    path('<int:pk>/', OrderDetailAPIView.as_view(), name='order-detail'),
    path('<int:pk>/set-locations/', OrderSetLocationsAPIView.as_view(), name='order-set-locations'),
    path('<int:pk>/status/', OrderStatusAPIView.as_view(), name='order-status'),
]
