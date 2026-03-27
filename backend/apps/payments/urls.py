from django.urls import path

from apps.payments.views import (
    BuyerOrderCheckoutCreateAPIView,
    BuyerOrderCheckoutVerifyAPIView,
    LogisticsQuoteCheckoutCreateAPIView,
    LogisticsQuoteCheckoutVerifyAPIView,
    PaymentDetailAPIView,
    PaymentPayAPIView,
    PaymentReleaseAPIView,
    ReviewListCreateAPIView,
)

urlpatterns = [
    path('pay/<int:order_id>/', PaymentPayAPIView.as_view(), name='payment-pay'),
    path('checkout/create/<int:order_id>/', BuyerOrderCheckoutCreateAPIView.as_view(), name='buyer-checkout-create'),
    path('checkout/verify/<int:order_id>/', BuyerOrderCheckoutVerifyAPIView.as_view(), name='buyer-checkout-verify'),
    path('release/<int:order_id>/', PaymentReleaseAPIView.as_view(), name='payment-release'),
    path('<int:order_id>/', PaymentDetailAPIView.as_view(), name='payment-detail'),
    path('reviews/', ReviewListCreateAPIView.as_view(), name='review-list-create'),
    path('logistics/checkout/create/<int:request_id>/', LogisticsQuoteCheckoutCreateAPIView.as_view(), name='logistics-checkout-create'),
    path('logistics/checkout/verify/<int:request_id>/', LogisticsQuoteCheckoutVerifyAPIView.as_view(), name='logistics-checkout-verify'),
]
