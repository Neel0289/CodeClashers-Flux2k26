from django.urls import path

from apps.users.views import GoogleLoginAPIView, LoginAPIView, ProfileAPIView, RegisterAPIView

urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='auth-register'),
    path('login/', LoginAPIView.as_view(), name='auth-login'),
    path('google-login/', GoogleLoginAPIView.as_view(), name='auth-google-login'),
    path('profile/', ProfileAPIView.as_view(), name='auth-profile'),
]
