from datetime import date

import requests


STATE_FALLBACK_COORDS = {
    'gujarat': (22.2587, 71.1924),
    'maharashtra': (19.7515, 75.7139),
    'punjab': (31.1471, 75.3412),
    'uttar pradesh': (26.8467, 80.9462),
    'karnataka': (15.3173, 75.7139),
    'tamil nadu': (11.1271, 78.6569),
    'rajasthan': (27.0238, 74.2179),
    'haryana': (29.0588, 76.0856),
    'madhya pradesh': (22.9734, 78.6569),
    'andhra pradesh': (15.9129, 79.7400),
    'west bengal': (22.9868, 87.8550),
}


def _fallback_weather(state):
    state_key = str(state or '').strip().lower()
    month = date.today().month

    # Keep a stable, believable fallback profile by season and state.
    if month in [6, 7, 8, 9]:
        template = {'temp_max': 31, 'temp_min': 25, 'precipitation_mm': 18, 'wind_speed': 22, 'weather_code': 63}
    elif month in [12, 1, 2]:
        template = {'temp_max': 24, 'temp_min': 11, 'precipitation_mm': 0, 'wind_speed': 14, 'weather_code': 1}
    else:
        template = {'temp_max': 33, 'temp_min': 20, 'precipitation_mm': 2, 'wind_speed': 16, 'weather_code': 2}

    if state_key in {'punjab', 'haryana'} and month in [12, 1, 2]:
        template = {'temp_max': 18, 'temp_min': 6, 'precipitation_mm': 1, 'wind_speed': 12, 'weather_code': 3}

    condition = decode_weather_code(template['weather_code'])
    fallback = {
        **template,
        'condition': condition,
        'source': 'fallback',
    }
    fallback['price_recommendation'] = generate_weather_price_advice(fallback)
    return fallback


def get_coordinates(city, state):
    query = f"{city}, {state}, India"
    url = 'https://geocoding-api.open-meteo.com/v1/search'
    try:
        response = requests.get(url, params={'name': query, 'count': 1}, timeout=8)
        response.raise_for_status()
        results = response.json().get('results', [])
        if results:
            return results[0]['latitude'], results[0]['longitude']

        state_only = requests.get(url, params={'name': f"{state}, India", 'count': 1}, timeout=8)
        state_only.raise_for_status()
        state_results = state_only.json().get('results', [])
        if state_results:
            return state_results[0]['latitude'], state_results[0]['longitude']
    except Exception:
        pass

    state_key = str(state or '').strip().lower()
    if state_key in STATE_FALLBACK_COORDS:
        return STATE_FALLBACK_COORDS[state_key]
    return None, None


def decode_weather_code(code):
    if code == 0:
        return ('Clear Sky', 'clear', 'Sun')
    if code in [1, 2, 3]:
        return ('Partly Cloudy', 'mild', 'Cloud')
    if code in [51, 53, 55]:
        return ('Drizzle', 'rain', 'CloudDrizzle')
    if code in [61, 63, 65, 66, 67, 80, 81, 82]:
        return ('Rain', 'rain', 'CloudRain')
    if code in [71, 73, 75, 77, 85, 86]:
        return ('Snowfall', 'cold', 'CloudSnow')
    if code in [95, 96, 99]:
        return ('Thunderstorm', 'storm', 'CloudLightning')
    return ('Cloudy', 'mild', 'Cloud')


def generate_weather_price_advice(weather):
    condition_type = weather['condition'][1]
    temp_max = weather['temp_max']
    precipitation = weather['precipitation_mm']
    wind = weather['wind_speed']

    if condition_type == 'storm' or precipitation > 30:
        return {
            'action': 'RAISE PRICE',
            'color': 'green',
            'icon': 'TrendingUp',
            'reason': f"Heavy rain/storm expected tomorrow ({precipitation}mm). Transport will be difficult, supply to markets will drop. Prices are likely to rise.",
            'suggested_change': '+8% to +15%',
        }
    if condition_type == 'rain' or precipitation > 10:
        return {
            'action': 'SLIGHT RAISE',
            'color': 'green',
            'icon': 'TrendingUp',
            'reason': f"Rain expected ({precipitation}mm). Mild supply disruption expected. Consider a small price increase.",
            'suggested_change': '+3% to +8%',
        }
    if temp_max > 40:
        return {
            'action': 'SELL QUICKLY',
            'color': 'amber',
            'icon': 'AlertTriangle',
            'reason': f"Extreme heat expected ({temp_max}C). Perishable crops may deteriorate faster. Consider selling at or slightly below current price to move stock quickly.",
            'suggested_change': '-5% to 0%',
        }
    if condition_type == 'cold' or weather['temp_min'] < 4:
        return {
            'action': 'RAISE PRICE',
            'color': 'green',
            'icon': 'TrendingUp',
            'reason': f"Cold wave / frost conditions expected ({weather['temp_min']}C min). Crop damage is likely, supply will tighten. Prices typically rise.",
            'suggested_change': '+10% to +20%',
        }
    if wind > 40:
        return {
            'action': 'HOLD PRICE',
            'color': 'amber',
            'icon': 'Minus',
            'reason': f"Strong winds ({wind} km/h) may slow transport. Slight disruption possible. Hold your current price.",
            'suggested_change': '0%',
        }

    return {
        'action': 'HOLD PRICE',
        'color': 'gray',
        'icon': 'Minus',
        'reason': f"Clear/mild weather expected ({temp_max}C, {precipitation}mm rain). Normal supply conditions. No price change needed.",
        'suggested_change': '0%',
    }


def get_tomorrow_weather(city, state):
    lat, lon = get_coordinates(city, state)
    if lat is None or lon is None:
        return _fallback_weather(state)

    url = 'https://api.open-meteo.com/v1/forecast'
    params = {
        'latitude': lat,
        'longitude': lon,
        'daily': 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode',
        'timezone': 'Asia/Kolkata',
        'forecast_days': 2,
    }
    try:
        response = requests.get(url, params=params, timeout=8)
        response.raise_for_status()
        daily = response.json()['daily']

        condition = decode_weather_code(daily['weathercode'][1])
        tomorrow = {
            'temp_max': daily['temperature_2m_max'][1],
            'temp_min': daily['temperature_2m_min'][1],
            'precipitation_mm': daily['precipitation_sum'][1],
            'wind_speed': daily['windspeed_10m_max'][1],
            'weather_code': daily['weathercode'][1],
            'condition': condition,
            'source': 'live',
        }
        tomorrow['price_recommendation'] = generate_weather_price_advice(tomorrow)
        return tomorrow
    except Exception:
        return _fallback_weather(state)
