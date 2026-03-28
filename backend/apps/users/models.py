from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
	ROLE_CHOICES = [
		('farmer', 'Farmer'),
		('buyer', 'Buyer'),
		('logistics', 'Logistics Partner'),
		('admin', 'Admin'),
	]
	role = models.CharField(max_length=20, choices=ROLE_CHOICES)
	phone = models.CharField(max_length=15, blank=True)
	profile_complete = models.BooleanField(default=False)
	email = models.EmailField(unique=True)


class FarmerProfile(models.Model):
	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='farmer_profile')
	farm_name = models.CharField(max_length=200)
	state = models.CharField(max_length=100)
	city = models.CharField(max_length=100)
	latitude = models.FloatField(null=True, blank=True)
	longitude = models.FloatField(null=True, blank=True)


class BuyerProfile(models.Model):
	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='buyer_profile')
	business_name = models.CharField(max_length=200)
	business_type = models.CharField(max_length=50, choices=[('restaurant', 'Restaurant'), ('store', 'Store')])
	state = models.CharField(max_length=100)
	city = models.CharField(max_length=100)
	latitude = models.FloatField(null=True, blank=True)
	longitude = models.FloatField(null=True, blank=True)


class LogisticsProfile(models.Model):
	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='logistics_profile')
	vehicle_type = models.CharField(max_length=50, choices=[('bike', 'Bike'), ('tempo', 'Tempo'), ('truck', 'Truck')])
	max_weight_kg = models.FloatField()
	operating_states = models.JSONField(default=list)
	vehicles = models.JSONField(default=list, blank=True)
	rating = models.FloatField(default=0.0)
	total_deliveries = models.IntegerField(default=0)

# Create your models here.
