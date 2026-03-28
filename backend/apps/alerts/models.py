from django.db import models

from apps.products.models import Product
from apps.users.models import User


class SellFastAlert(models.Model):
    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sell_fast_alerts')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='sell_fast_alerts')
    quantity_kg = models.FloatField(default=0)
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    note = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

