import json
import math
import httpx
from loguru import logger
from app.core.config import settings
from app.integrations.google_maps import haversine_km

CACHE_TTL = 3600  # 1 hour


def _polyline_decode(encoded: str) -> list[dict]:
    """Decode a Google Maps encoded polyline string to list of {lat, lng}."""
    coords = []
    index, lat, lng = 0, 0, 0
    while index < len(encoded):
        for is_lng in (False, True):
            shift, result = 0, 0
            while True:
                b = ord(encoded[index]) - 63
                index += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            delta = ~(result >> 1) if result & 1 else result >> 1
            if is_lng:
                lng += delta
            else:
                lat += delta
        coords.append({"lat": lat / 1e5, "lng": lng / 1e5})
    return coords


async def get_directions(
    origin_lat: float, origin_lng: float,
    dest_lat: float, dest_lng: float,
    redis=None,
) -> dict:
    cache_key = f"directions:{origin_lat:.5f},{origin_lng:.5f}:{dest_lat:.5f},{dest_lng:.5f}"

    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)

    if not settings.GOOGLE_MAPS_API_KEY:
        # Fallback: straight-line distance, no polyline
        dist = haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
        result = {
            "polyline": [{"lat": origin_lat, "lng": origin_lng}, {"lat": dest_lat, "lng": dest_lng}],
            "distance_km": round(dist, 2),
            "duration_min": int(dist / 0.5),  # rough estimate: 30 km/h avg
        }
    else:
        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": f"{origin_lat},{origin_lng}",
            "destination": f"{dest_lat},{dest_lng}",
            "key": settings.GOOGLE_MAPS_API_KEY,
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
        data = resp.json()
        if data.get("status") != "OK" or not data.get("routes"):
            raise ValueError(f"Directions API error: {data.get('status')}")
        route = data["routes"][0]["legs"][0]
        encoded = data["routes"][0]["overview_polyline"]["points"]
        result = {
            "polyline": _polyline_decode(encoded),
            "distance_km": round(route["distance"]["value"] / 1000, 2),
            "duration_min": route["duration"]["value"] // 60,
        }

    if redis:
        await redis.setex(cache_key, CACHE_TTL, json.dumps(result))
    return result


async def geocode_address(address: str, redis=None) -> dict:
    cache_key = f"geocode:{address.lower().strip()}"

    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)

    if not settings.GOOGLE_MAPS_API_KEY:
        raise ValueError("GOOGLE_MAPS_API_KEY not configured")

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": settings.GOOGLE_MAPS_API_KEY}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, params=params)
    data = resp.json()

    if data.get("status") != "OK" or not data.get("results"):
        raise ValueError(f"Geocode API error: {data.get('status')}")

    loc = data["results"][0]["geometry"]["location"]
    result = {
        "lat": loc["lat"],
        "lng": loc["lng"],
        "formatted_address": data["results"][0]["formatted_address"],
    }

    if redis:
        await redis.setex(cache_key, CACHE_TTL, json.dumps(result))
    return result


async def get_distance_matrix(origins: list[str], destinations: list[str], redis=None) -> dict:
    cache_key = f"distmatrix:{','.join(origins)}:{','.join(destinations)}"

    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)

    if not settings.GOOGLE_MAPS_API_KEY:
        # Fallback: Haversine for each pair
        results = []
        for orig in origins:
            olat, olng = map(float, orig.split(","))
            for dest in destinations:
                dlat, dlng = map(float, dest.split(","))
                dist = haversine_km(olat, olng, dlat, dlng)
                results.append({"origin": orig, "destination": dest, "distance_km": round(dist, 2), "duration_min": int(dist / 0.5)})
        result = {"results": results}
    else:
        url = "https://maps.googleapis.com/maps/api/distancematrix/json"
        params = {
            "origins": "|".join(origins),
            "destinations": "|".join(destinations),
            "key": settings.GOOGLE_MAPS_API_KEY,
            "units": "metric",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
        data = resp.json()

        entries = []
        for i, row in enumerate(data.get("rows", [])):
            for j, elem in enumerate(row.get("elements", [])):
                entries.append({
                    "origin": origins[i] if i < len(origins) else "",
                    "destination": destinations[j] if j < len(destinations) else "",
                    "distance_km": elem["distance"]["value"] / 1000 if elem.get("status") == "OK" else None,
                    "duration_min": elem["duration"]["value"] // 60 if elem.get("status") == "OK" else None,
                })
        result = {"results": entries}

    if redis:
        await redis.setex(cache_key, CACHE_TTL, json.dumps(result))
    return result
