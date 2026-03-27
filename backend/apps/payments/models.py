from django.db import models

from apps.orders.models import Order
from apps.users.models import User


class Payment(models.Model):
	STATUS = [('pending', 'Pending'), ('escrow', 'In Escrow'), ('released', 'Released')]
	order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
	buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments_made')
	produce_amount = models.DecimalField(max_digits=10, decimal_places=2)
	logistics_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	total_amount = models.DecimalField(max_digits=10, decimal_places=2)
	status = models.CharField(max_length=20, choices=STATUS, default='pending')
	paid_at = models.DateTimeField(null=True, blank=True)
	released_at = models.DateTimeField(null=True, blank=True)


class Review(models.Model):
	order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='reviews')
	reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
	reviewee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
	rating = models.IntegerField()
	comment = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

# Create your models here.
