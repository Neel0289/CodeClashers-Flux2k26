from django.urls import path

from apps.market_prices.views import TomorrowWeatherAPIView

urlpatterns = [
    path('tomorrow/', TomorrowWeatherAPIView.as_view(), name='tomorrow-weather'),
]
