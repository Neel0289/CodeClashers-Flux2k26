from django.urls import path

from apps.payments.views import PaymentDetailAPIView, PaymentPayAPIView, PaymentReleaseAPIView, ReviewListCreateAPIView

urlpatterns = [
    path('pay/<int:order_id>/', PaymentPayAPIView.as_view(), name='payment-pay'),
    path('release/<int:order_id>/', PaymentReleaseAPIView.as_view(), name='payment-release'),
    path('<int:order_id>/', PaymentDetailAPIView.as_view(), name='payment-detail'),
    path('reviews/', ReviewListCreateAPIView.as_view(), name='review-list-create'),
]
