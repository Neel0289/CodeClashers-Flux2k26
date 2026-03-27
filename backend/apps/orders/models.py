from django.db import models

from apps.negotiations.models import Negotiation
from apps.products.models import Product
from apps.users.models import User


class Order(models.Model):
	STATUS = [
		('confirmed', 'Confirmed'),
		('logistics_pending', 'Logistics Pending'),
		('logistics_assigned', 'Logistics Assigned'),
		('picked_up', 'Picked Up'),
		('in_transit', 'In Transit'),
		('delivered', 'Delivered'),
		('completed', 'Completed'),
	]
	negotiation = models.OneToOneField(Negotiation, on_delete=models.CASCADE, related_name='order')
	farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='farmer_orders')
	buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='buyer_orders')
	product = models.ForeignKey(Product, on_delete=models.CASCADE)
	quantity = models.FloatField()
	agreed_price = models.DecimalField(max_digits=10, decimal_places=2)
	pickup_state = models.CharField(max_length=100, blank=True)
	pickup_city = models.CharField(max_length=100, blank=True)
	drop_state = models.CharField(max_length=100, blank=True)
	drop_city = models.CharField(max_length=100, blank=True)
	status = models.CharField(max_length=30, choices=STATUS, default='confirmed')
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

# Create your models here.
