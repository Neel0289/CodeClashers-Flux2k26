from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_buyerprofile_latitude_buyerprofile_longitude'),
    ]

    operations = [
        migrations.AddField(
            model_name='logisticsprofile',
            name='vehicles',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
