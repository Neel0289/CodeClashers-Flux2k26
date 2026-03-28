from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.alerts.models import SellFastAlert
from apps.alerts.serializers import SellFastAlertSerializer


class SellFastAlertListCreateAPIView(APIView):
    def get(self, request):
        user = request.user

        if user.role == 'farmer':
            queryset = SellFastAlert.objects.filter(farmer=user)
        else:
            cutoff = timezone.now() - timedelta(hours=48)
            queryset = SellFastAlert.objects.filter(is_active=True, created_at__gte=cutoff)

        return Response(SellFastAlertSerializer(queryset, many=True).data)

    def post(self, request):
        if request.user.role != 'farmer':
            raise PermissionDenied('Only farmers can send Sell Fast alerts.')

        serializer = SellFastAlertSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        alert = serializer.save()
        return Response(SellFastAlertSerializer(alert).data, status=status.HTTP_201_CREATED)
