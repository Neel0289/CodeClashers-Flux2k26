from django.core.management.base import BaseCommand

from apps.market_prices.services import fetch_market_prices


class Command(BaseCommand):
    help = 'Fetches today mandi prices for top commodities and states.'

    def handle(self, *args, **options):
        commodities = ['Tomato', 'Onion', 'Potato', 'Wheat', 'Rice', 'Chilli', 'Garlic', 'Cauliflower', 'Brinjal', 'Lemon']
        states = ['Gujarat', 'Maharashtra', 'Punjab', 'Uttar Pradesh', 'Karnataka', 'Tamil Nadu', 'Rajasthan', 'Haryana']

        total = 0
        for commodity in commodities:
            for state in states:
                records = fetch_market_prices(commodity=commodity, state=state, limit=50)
                if records and isinstance(records[0], dict):
                    total += len(records)
                else:
                    total += len(records)

        self.stdout.write(self.style.SUCCESS(f'Fetched {total} price records for today.'))
