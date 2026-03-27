from django.db import models

from apps.users.models import User


class Product(models.Model):
	UNIT_CHOICES = [('kg', 'KG'), ('ton', 'Ton'), ('piece', 'Piece')]
	CATEGORY_CHOICES = [
		('vegetables', 'Vegetables'),
		('fruits', 'Fruits'),
		('grains', 'Grains'),
		('spices', 'Spices'),
		('dairy', 'Dairy'),
	]
	farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='products')
	name = models.CharField(max_length=200)
	description = models.TextField()
	category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
	base_price = models.DecimalField(max_digits=10, decimal_places=2)
	quantity_available = models.FloatField(null=True, blank=True, default=0)
	unit = models.CharField(max_length=20, choices=UNIT_CHOICES)
	harvest_date = models.DateField()
	image = models.ImageField(upload_to='products/', null=True, blank=True)
	state = models.CharField(max_length=100, null=True, blank=True)
	city = models.CharField(max_length=100, null=True, blank=True)
	is_available = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

# Create your models here.
