from django.urls import path

from apps.market_prices.views import (
    CommodityListAPIView,
    FarmerAssistantChatAPIView,
    MarketPriceListAPIView,
    PriceCompareAPIView,
)

urlpatterns = [
    path('', MarketPriceListAPIView.as_view(), name='market-price-list'),
    path('commodities/', CommodityListAPIView.as_view(), name='market-price-commodities'),
    path('compare/', PriceCompareAPIView.as_view(), name='market-price-compare'),
    path('assistant/chat/', FarmerAssistantChatAPIView.as_view(), name='farmer-assistant-chat'),
]
