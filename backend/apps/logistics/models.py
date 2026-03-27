from django.db import models

from apps.orders.models import Order
from apps.users.models import User


class LogisticsRequest(models.Model):
	STATUS = [
		('pending', 'Pending'),
		('quoted', 'Quoted'),
		('accepted', 'Accepted'),
		('cancelled', 'Cancelled'),
		('picked_up', 'Picked Up'),
		('delivered', 'Delivered'),
	]
	order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='logistics_requests')
	logistics_partner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='logistics_jobs')
	crop_description = models.TextField()
	weight_kg = models.FloatField()
	pickup_state = models.CharField(max_length=100)
	pickup_city = models.CharField(max_length=100)
	drop_state = models.CharField(max_length=100)
	drop_city = models.CharField(max_length=100)
	quoted_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
	status = models.CharField(max_length=20, choices=STATUS, default='pending')
	created_at = models.DateTimeField(auto_now_add=True)


class LogisticsRoute(models.Model):
	logistics_partner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_routes')
	start_latitude = models.FloatField()
	start_longitude = models.FloatField()
	end_latitude = models.FloatField()
	end_longitude = models.FloatField()
	start_city = models.CharField(max_length=100, blank=True)
	start_state = models.CharField(max_length=100, blank=True)
	end_city = models.CharField(max_length=100, blank=True)
	end_state = models.CharField(max_length=100, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

# Create your models here.
