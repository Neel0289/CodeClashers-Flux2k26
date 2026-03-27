from django.db import models

from apps.products.models import Product
from apps.users.models import User


class Negotiation(models.Model):
	STATUS = [('open', 'Open'), ('countered', 'Countered'), ('accepted', 'Accepted'), ('rejected', 'Rejected')]
	product = models.ForeignKey(Product, on_delete=models.CASCADE)
	buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='negotiations')
	farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='farmer_negotiations')
	quantity = models.FloatField()
	status = models.CharField(max_length=20, choices=STATUS, default='open')
	final_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)


class NegotiationMessage(models.Model):
	negotiation = models.ForeignKey(Negotiation, on_delete=models.CASCADE, related_name='messages')
	sender = models.ForeignKey(User, on_delete=models.CASCADE)
	offered_price = models.DecimalField(max_digits=10, decimal_places=2)
	message = models.TextField(blank=True)
	action = models.CharField(max_length=20, choices=[('offer', 'Offer'), ('counter', 'Counter'), ('accept', 'Accept'), ('reject', 'Reject')], default='offer')
	timestamp = models.DateTimeField(auto_now_add=True)

# Create your models here.
