from django.db import models


class MarketPrice(models.Model):
    commodity = models.CharField(max_length=200)
    variety = models.CharField(max_length=200, blank=True)
    state = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True)
    market = models.CharField(max_length=200, blank=True)
    min_price = models.DecimalField(max_digits=10, decimal_places=2)
    max_price = models.DecimalField(max_digits=10, decimal_places=2)
    modal_price = models.DecimalField(max_digits=10, decimal_places=2)
    price_date = models.DateField()
    unit = models.CharField(max_length=20, default='Quintal')
    fetched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['commodity', 'state', 'market', 'price_date']

    def __str__(self):
        return f"{self.commodity} - {self.market} ({self.price_date})"
