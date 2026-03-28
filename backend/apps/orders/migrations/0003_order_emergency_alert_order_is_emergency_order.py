from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('alerts', '0001_initial'),
        ('orders', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='emergency_alert',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='orders', to='alerts.sellfastalert'),
        ),
        migrations.AddField(
            model_name='order',
            name='is_emergency_order',
            field=models.BooleanField(default=False),
        ),
    ]
