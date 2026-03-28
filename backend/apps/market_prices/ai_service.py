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
        'You are KhetBazaar AI assistant for Indian farmers and agricultural professionals. '
        'You are domain-expert and app-expert combined. '
        'You know how the entire KhetBazaar platform works and can help with questions about any feature. '
        '\n'
        'APP KNOWLEDGE AREAS:\n'
        '• Farmer Dashboard: view stats, emergency Sell Fast alerts, recent orders/negotiations/logistics, nearby buyers on map, seller insights/charts, reviews\n'
        '• Market Intelligence: compare your crop prices vs mandi modal rates, view tomorrow weather forecast, search commodities by state\n'
        '• Listings: create product listings with stock quantity, base price, and category\n'
        '• Orders & Logistics: place orders with farmers, negotiate prices, request logistics for confirmed orders, track logistics partner responses, generate invoices\n'
        '• Negotiations: counter-offer prices, accept/reject farmer offers\n'
        '• Logistics Request Flow: select logistics partner, verify pickup/drop details, request quotes, accept/decline fees, track pickup/delivery status\n'
        '• Reviews: rate farmers after order delivery (3-day window), view farmer ratings\n'
        '• Payments: secure checkout via Razorpay, invoices (order invoice + logistics invoice)\n'
        '• Chat: direct messaging with farmers on confirmed orders\n'
        '• Sell Fast Alerts: farmers can send urgent sell requests to notify all interested buyers\n'
        '\n'
        'RESPONSE RULES:\n'
        '1. If user asks about crop planning: use weather + nearby demand + market prices to suggest 2-3 crops with risk notes and actionable steps.\n'
        '2. If user asks about app usage: guide them step-by-step through the relevant feature flow.\n'
        '3. If user asks something off-topic or unrelated to farming/app: politely acknowledge, then redirect to how KhetBazaar can help with their agricultural/trading goals.\n'
        '4. Always use concise, practical language. Include brief reasoning and 2-3 next steps.\n'
        '5. Never invent features; stay consistent with platform capabilities.\n'
        '6. When unclear, offer to help with common tasks: crop planning, price comparison, order/logistics guidance, or app navigation.'
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

    # Soil-type questions (e.g., black soil, red soil, alluvial)
    if any(token in question for token in ['soil', 'black soil', 'black cotton soil', 'red soil', 'alluvial', 'loamy', 'clay soil', 'sandy soil']):
        top_demand = demand[:3]
        top_market = market[:3]
        demand_text = ', '.join([f"{row['product']} ({row['qty_kg']:.0f}kg)" for row in top_demand]) if top_demand else 'No strong nearby demand signal yet'
        market_text = ', '.join([f"{row['commodity']} (₹{row['modal_price_kg']:.0f}/kg)" for row in top_market]) if top_market else 'No mandi price signal available right now'

        black_soil_hint = ''
        if any(token in question for token in ['black soil', 'black cotton soil']):
            black_soil_hint = (
                "\n\nFor black soil specifically, commonly suitable crops are cotton, soybean, sorghum (jowar), pigeon pea (tur), and groundnut "
                "depending on irrigation and season."
            )

        return (
            f"Great question. Soil type is important for crop selection in {state}.\n"
            f"Nearby demand signal: {demand_text}.\n"
            f"Current mandi signal: {market_text}."
            f"{black_soil_hint}\n\n"
            "Recommended approach:\n"
            "1. Pick 2 crops that match your soil and also show strong local demand.\n"
            "2. Validate water needs against your irrigation availability.\n"
            "3. Check weather risk in Market Intelligence before final sowing.\n"
            "4. Start with a split plan (primary + backup crop) to reduce risk.\n\n"
            "If you share your state, season, and irrigation type, I can narrow this down to a specific crop plan."
        )

    # Logistics questions
    if any(token in question for token in ['logistics', 'delivery', 'transport', 'ship', 'carrier', 'shipping', 'how to request logistics']):
        return (
            "To request logistics for a confirmed order:\n"
            "1. Go to Dashboard > Orders & Logistics tab.\n"
            "2. In the Orders list, find a confirmed order and click 'Select Logistics'.\n"
            "3. Verify pickup/drop locations and route on the map preview.\n"
            "4. Click 'Find Logistics For This Order' to see matching partners.\n"
            "5. Choose to 'Request Selected Partner' or 'Request All Matching Partners'.\n"
            "6. Track updates in 'Requested Logistics' and accept/decline quoted fees.\n"
            "7. Once accepted, track pickup and delivery status in real time.\n"
            "8. Generate logistics invoice after delivery by clicking 'Logistic Invoice' button."
        )

    # Weather & climate questions
    if any(token in question for token in ['weather', 'rain', 'temperature', 'climate', 'forecast', 'cold', 'hot', 'wind', 'storm', 'tomorrow weather']):
        condition = (weather.get('condition') or ['Unknown'])[0]
        rain = weather.get('precipitation_mm', '--')
        tmax = weather.get('temp_max', '--')
        tmin = weather.get('temp_min', '--')
        wind = weather.get('wind_speed', '--')
        recommendation = (weather.get('price_recommendation') or {}).get('action', 'HOLD PRICE')
        reason = (weather.get('price_recommendation') or {}).get('reason', 'Monitor market closely.')
        return (
            f"Weather forecast for {city}, {state}:\n"
            f"Condition: {condition}\n"
            f"Temperature: {tmin}–{tmax}°C | Rainfall: {rain} mm | Wind: {wind} km/h\n\n"
            f"📊 Pricing Signal: {recommendation}\n"
            f"Reason: {reason}\n\n"
            "💡 Action: Review Market Intelligence to compare your current price with mandi modal rates. "
            "Adjust listing price if needed based on expected supply-demand shifts."
        )

    # Crop recommendations / growth questions
    if any(token in question for token in ['crop', 'grow', 'sow', 'plant', 'next month', 'next season', 'which crop', 'what to grow', 'farming advice']):
        top_demand = demand[:3]
        top_market = market[:3]
        demand_text = ', '.join([f"{row['product']} ({row['qty_kg']:.0f}kg)" for row in top_demand]) if top_demand else 'No strong demand signal yet'
        market_text = ', '.join([f"{row['commodity']} (₹{row['modal_price_kg']:.0f}/kg)" for row in top_market]) if top_market else 'No mandi data available'
        
        return (
            f"🌱 Crop suggestion for {state}:\n"
            f"Nearby buyer demand (last 30 days): {demand_text}\n"
            f"Top mandi prices today: {market_text}\n\n"
            "📋 Planning steps:\n"
            "1. Shortlist 2–3 crops with BOTH strong demand AND high mandi prices.\n"
            "2. Split your acreage across crops to reduce risk.\n"
            "3. Check tomorrow's weather forecast in Market Intelligence.\n"
            "4. Review seasonal disease/pest patterns for these crops.\n"
            "5. Once selected, add listings in app to reach nearby buyers.\n\n"
            "💡 Next: Go to Market Intelligence to compare crops side-by-side before final decision."
        )

    # Negotiation questions
    if any(token in question for token in ['negotiate', 'price negotiation', 'counter offer', 'how to negotiate', 'offer price']):
        return (
            "How to negotiate prices with farmers:\n"
            "1. Browse farmer listings in Market Intelligence or by nearby map.\n"
            "2. Click 'Place Order' on a crop listing.\n"
            "3. Choose 'Negotiate Price' and enter your price per kg.\n"
            "4. Submit negotiation request.\n"
            "5. Farmer will counter-offer or accept your price.\n"
            "6. Once accepted by both, order becomes 'confirmed'.\n"
            "7. You can then request logistics and initiate payment via Razorpay.\n\n"
            "💡 Pricing tip: Check Market Intelligence for mandi modal rates first to understand fair market price."
        )

    # Orders & Invoices questions
    if any(token in question for token in ['order', 'invoice', 'payment', 'razorpay', 'checkout', 'bill', 'purchase', 'how to place order']):
        return (
            "How to place an order and generate invoices:\n"
            "1. Find a crop in listings or Market Intelligence.\n"
            "2. Click 'Place Order' and choose Direct Order or Negotiate Price.\n"
            "3. Once confirmed, complete secure Razorpay payment.\n"
            "4. Order status changes to 'confirmed'.\n"
            "5. Generate order invoice: click 'Invoice' button in Recent Orders.\n"
            "6. Once logistics is assigned and quoted, click 'Logistic Invoice' to download logistics bill.\n"
            "7. Both invoices include all details: seller, buyer, product, quantity, price, route.\n\n"
            "💡 Track everything in Dashboard > Recent Orders section."
        )

    # Listing & selling questions
    if any(token in question for token in ['listing', 'sell', 'price my crop', 'add product', 'stock', 'quantity', 'how to sell']):
        return (
            "How to create and manage listings (for farmers):\n"
            "1. Go to Dashboard > Add Product.\n"
            "2. Enter crop name, category, base price, and available quantity.\n"
            "3. Listing goes live and appears when buyers search nearby.\n"
            "4. Adjust price in Market Intelligence tab by comparing with mandi rates.\n"
            "5. Track incoming orders and negotiations in Dashboard.\n"
            "6. Once buyer confirms, order appears in Recent Orders.\n\n"
            "💡 Tip: Check Market Intelligence before setting base price to remain competitive.\n"
            "💡 Emergency: Use 'Sell Fast Alert' to notify all nearby buyers urgently."
        )

    # Chat & communication questions
    if any(token in question for token in ['chat', 'message', 'communicate', 'talk to farmer', 'contact']):
        return (
            "How to use in-app messaging:\n"
            "1. Once you place an order and it is confirmed, a chat window opens.\n"
            "2. Click the buyer/farmer name in order card to open chat thread.\n"
            "3. Send direct messages for order clarifications, pickup times, etc.\n"
            "4. Both farmer and buyer can see all messages in chronological order.\n"
            "5. Chat is available for confirmed orders only.\n\n"
            "💡 Use chat to finalize details before pickup/delivery."
        )

    # Reviews & ratings questions
    if any(token in question for token in ['review', 'rating', 'feedback', 'how to rate']):
        return (
            "How to leave and view reviews:\n"
            "1. After order delivery, a 'Review Farmer' button appears in Recent Orders.\n"
            "2. You have 3 days from delivery to submit your review.\n"
            "3. Rate 1–5 stars and add optional comment.\n"
            "4. Reviews are public and help build farmer credibility.\n"
            "5. View farmer's average rating and past reviews on their listing.\n\n"
            "💡 Honest feedback helps the farm community improve service quality."
        )

    # Emergency/Sell Fast Alert questions
    if any(token in question for token in ['sell fast', 'emergency', 'urgent', 'alert all buyers', 'notify buyers']):
        return (
            "How to trigger a Sell Fast alert (Farmers only):\n"
            "1. Go to Dashboard and locate 'Emergency Sell Fast' section.\n"
            "2. Click 'Create Alert' and enter product name, quantity (kg), optional price/kg, and urgent note.\n"
            "3. Alert is sent to all nearby buyers in real time.\n"
            "4. Buyers see it in their 'Emergency Sell Fast Alerts' feed with farmer contact info.\n"
            "5. Interested buyers can immediately place orders or message you.\n\n"
            "💡 Use this when crops need urgent sale due to ripeness, spoilage risk, or urgent cash need."
        )

    # Map & nearby questions
    if any(token in question for token in ['map', 'nearby', 'location', 'distance', 'find farmers', 'find buyers']):
        return (
            "How to use the map feature:\n"
            "1. Open Nearby Farmers Map (buyer) or Logistics Visualization (farmer).\n"
            "2. Filter by crop category and specific item.\n"
            "3. Green pin = buyers/farmers; blue pin = you.\n"
            "4. Hover/click pins to see name, location, crops, and distance.\n"
            "5. Buyers: click on a farmer to view their listings.\n"
            "6. Farmers: see logistics partner coverage and routes.\n\n"
            "💡 Radius is 50 km; adjust search by category to narrow results."
        )

    # Off-topic questions - graceful redirection
    if any(token in question for token in ['hello', 'hi', 'how are you', 'goodbye', 'thanks', 'thank you']):
        return (
            "Glad to help! I am here to support your farming or trading goals. 🌾\n\n"
            "I can assist with:\n"
            "1. Which crop to grow next based on weather & local demand\n"
            "2. Price negotiation and fair market comparison\n"
            "3. Navigating orders, logistics, invoices, and payments\n"
            "4. Tips on listings, reviews, and farm visibility\n\n"
            "What would you like help with today?"
        )

    # Default catch-all for truly unrelated topics
    return (
        "I see your question is beyond my farm & app expertise! 😊\n\n"
        "However, I am here to help you succeed with KhetBazaar:\n"
        "• 🌱 Crop planning (which crops to grow based on weather & demand)\n"
        "• 💰 Price negotiation & market intelligence\n"
        "• 📦 Orders, logistics, invoices, and payment\n"
        "• 📊 Listings, reviews, and farm insights\n"
        "• 💬 In-app chat and seller/buyer connections\n"
        "• 🚨 Emergency sell alerts for urgent stock\n\n"
        "Ask me anything about these topics, or tell me a specific task you'd like to accomplish on the platform!"
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
