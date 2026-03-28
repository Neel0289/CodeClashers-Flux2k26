from datetime import timedelta

import requests
from django.conf import settings
from django.db.models import Q, Sum
from django.utils import timezone

from apps.market_prices.models import MarketPrice
from apps.market_prices.weather_service import get_tomorrow_weather
from apps.orders.models import Order


def _summarize_nearby_demand(farmer_state):
    since = timezone.now() - timedelta(days=30)
    rows = (
        Order.objects.filter(created_at__gte=since)
        .filter(
            Q(buyer__buyer_profile__state__iexact=farmer_state)
            | Q(drop_state__iexact=farmer_state)
        )
        .values('product__name')
        .annotate(total_qty=Sum('quantity'))
        .order_by('-total_qty')[:5]
    )
    return [
        {
            'product': row.get('product__name') or 'Unknown',
            'qty_kg': float(row.get('total_qty') or 0),
        }
        for row in rows
    ]


def _summarize_market_prices(farmer_state):
    rows = (
        MarketPrice.objects.filter(price_date=timezone.localdate(), state__iexact=farmer_state)
        .order_by('-modal_price')[:8]
    )
    return [
        {
            'commodity': row.commodity,
            'market': row.market,
            'modal_price_quintal': float(row.modal_price),
            'modal_price_kg': round(float(row.modal_price) / 100, 2),
        }
        for row in rows
    ]


def _build_system_prompt():
    return (
        'You are KhetBazaar AI assistant for Indian farmers. '
        'You help with two things: '\
        '1) crop planning suggestions for next sowing/harvest cycle, '\
        '2) app usage help (orders, negotiations, logistics, listings, market intelligence). '\
        'Use concise, practical language. '\
        'When suggesting crops, reason from weather, nearby demand, and market prices. '\
        'Always include brief risk notes and 2-3 actionable next steps. '\
        'Do not invent app features; stay consistent with provided context.'
    )


def _format_currency(value):
    try:
        return f"Rs {float(value):,.0f}"
    except Exception:
        return "Rs 0"


def _build_contextual_fallback(message, context_block):
    question = str(message or '').strip().lower()
    weather = context_block.get('tomorrow_weather') or {}
    demand = context_block.get('nearby_demand_last_30_days_kg') or []
    market = context_block.get('state_market_prices_today') or []
    location = context_block.get('farmer_location') or {}
    city = location.get('city') or 'your city'
    state = location.get('state') or 'your state'

    if any(token in question for token in ['logistics', 'delivery', 'transport', 'ship']):
        return (
            "To request logistics in this app:\n"
            "1. Go to Dashboard > Orders & Logistics tab.\n"
            "2. In the Orders list, click Select Logistics for a confirmed order.\n"
            "3. In Request Logistics, verify pickup/drop and route preview.\n"
            "4. Click Find Logistics For This Order, then Request Selected Partner or Request All Matching Partners.\n"
            "5. Track updates in Requested Logistics and accept/decline quoted fees."
        )

    if any(token in question for token in ['weather', 'rain', 'temperature', 'climate']):
        condition = (weather.get('condition') or ['Unknown'])[0]
        rain = weather.get('precipitation_mm', '--')
        tmax = weather.get('temp_max', '--')
        recommendation = (weather.get('price_recommendation') or {}).get('action', 'HOLD PRICE')
        return (
            f"Weather update for {city}, {state}: {condition}, max {tmax} C, rain {rain} mm. "
            f"Current pricing signal is {recommendation}.\n"
            "Action: keep an eye on transport risk and update listing prices in Market Intelligence if rain or storm probability rises."
        )

    if any(token in question for token in ['crop', 'grow', 'sow', 'plant', 'next month', 'next season']):
        top_demand = demand[:3]
        top_market = market[:3]
        demand_text = ', '.join([f"{row['product']} ({row['qty_kg']:.0f} kg demand)" for row in top_demand]) if top_demand else 'No strong demand signal yet'
        market_text = ', '.join([f"{row['commodity']} ({_format_currency(row['modal_price_quintal'])}/quintal)" for row in top_market]) if top_market else 'No live mandi price signal yet'
        return (
            f"Crop suggestion for {state}: start with crops that show both demand and strong mandi value.\n"
            f"Nearby demand (30 days): {demand_text}.\n"
            f"Top mandi prices today: {market_text}.\n"
            "Plan: shortlist 2 crops, split acreage to reduce risk, and review weather alert before final sowing decision."
        )

    if any(token in question for token in ['how', 'where', 'use app', 'dashboard', 'listing', 'negotiation', 'order']):
        return (
            "I can guide you through app flows:\n"
            "- Listings: add/edit stock and base price.\n"
            "- Market Intelligence: compare your price with mandi modal rate.\n"
            "- Orders & Logistics: select order, request logistics, and track partner responses.\n"
            "Ask me a specific task, for example: 'How to update listing price from market compare?'"
        )

    return (
        "I can help with crop planning and app usage. Ask one of these:\n"
        "- Which crop should I grow next month?\n"
        "- What does tomorrow weather imply for pricing?\n"
        "- How do I request logistics for an order?"
    )


def _call_openai(messages):
    api_key = getattr(settings, 'OPENAI_API_KEY', '')
    model = getattr(settings, 'OPENAI_MODEL', 'gpt-4.1-mini')
    if not api_key:
        return None

    response = requests.post(
        'https://api.openai.com/v1/responses',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        json={
            'model': model,
            'input': messages,
            'temperature': 0.35,
            'max_output_tokens': 450,
        },
        timeout=25,
    )
    response.raise_for_status()
    payload = response.json()

    output_text = payload.get('output_text')
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    for item in payload.get('output', []):
        for part in item.get('content', []):
            text = part.get('text')
            if text:
                return str(text).strip()

    return None


def generate_farmer_ai_reply(user, message, history=None):
    history = history or []
    farmer_state = getattr(getattr(user, 'farmer_profile', None), 'state', '') or ''
    farmer_city = getattr(getattr(user, 'farmer_profile', None), 'city', '') or ''

    weather = None
    if farmer_state and farmer_city:
        try:
            weather = get_tomorrow_weather(city=farmer_city, state=farmer_state)
        except Exception:
            weather = None

    try:
        demand = _summarize_nearby_demand(farmer_state) if farmer_state else []
    except Exception:
        demand = []

    try:
        market = _summarize_market_prices(farmer_state) if farmer_state else []
    except Exception:
        market = []

    context_block = {
        'farmer_location': {'city': farmer_city, 'state': farmer_state},
        'tomorrow_weather': weather,
        'nearby_demand_last_30_days_kg': demand,
        'state_market_prices_today': market,
        'app_sections': ['Dashboard', 'Market Intelligence', 'Orders & Logistics', 'Listings', 'Negotiations'],
    }

    trimmed_history = []
    for item in history[-8:]:
        role = str(item.get('role', '')).strip().lower()
        content = str(item.get('content', '')).strip()
        if role in {'user', 'assistant'} and content:
            trimmed_history.append({'role': role, 'content': content})

    messages = [
        {'role': 'system', 'content': _build_system_prompt()},
        {'role': 'system', 'content': f'Context JSON: {context_block}'},
        *trimmed_history,
        {'role': 'user', 'content': str(message or '').strip()},
    ]

    try:
        ai_text = _call_openai(messages)
        if ai_text:
            return {
                'reply': ai_text,
                'source': 'openai',
                'context': context_block,
            }
    except Exception:
        pass

    fallback = _build_contextual_fallback(message=message, context_block=context_block)
    return {
        'reply': fallback,
        'source': 'fallback',
        'context': context_block,
    }
