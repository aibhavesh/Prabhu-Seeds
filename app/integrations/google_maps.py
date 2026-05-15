import httpx
import math
from loguru import logger
from app.core.config import settings

# Simple in-memory reverse-geocode cache: "lat_rounded,lng_rounded" → state name
# Coordinates are rounded to 0.1° (~11 km) — good enough for state detection.
_state_cache: dict[str, str | None] = {}


async def reverse_geocode_state(lat: float, lng: float) -> str | None:
    """
    Return the Indian state name for a GPS coordinate using Google Geocoding API.
    Returns None if the API key is missing, the call fails, or no state is found.
    Caches results by coordinate rounded to 0.1° to avoid repeated API calls.
    """
    if not settings.GOOGLE_MAPS_API_KEY:
        return None
    if lat == 0.0 and lng == 0.0:
        return None

    cache_key = f"{round(lat, 1)},{round(lng, 1)}"
    if cache_key in _state_cache:
        return _state_cache[cache_key]

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "latlng": f"{lat},{lng}",
        "result_type": "administrative_area_level_1",
        "key": settings.GOOGLE_MAPS_API_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(url, params=params)
            data = resp.json()

        state: str | None = None
        for result in data.get("results", []):
            for component in result.get("address_components", []):
                if "administrative_area_level_1" in component.get("types", []):
                    state = component["long_name"]
                    break
            if state:
                break

        _state_cache[cache_key] = state
        return state
    except Exception as e:
        logger.warning(f"Reverse geocode failed for ({lat}, {lng}): {e}")
        return None


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two GPS coordinates in km (Haversine formula)."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_route_km(waypoints: list[tuple[float, float]], min_leg_m: float = 0) -> float:
    """Sum Haversine distances across a list of (lat, lng) waypoints.

    min_leg_m: skip any leg shorter than this many metres (filters GPS drift).
    """
    total = 0.0
    for i in range(len(waypoints) - 1):
        leg_km = haversine_km(*waypoints[i], *waypoints[i + 1])
        if leg_km * 1000 >= min_leg_m:
            total += leg_km
    return round(total, 1)


async def get_distance_matrix(origins: list[str], destinations: list[str]) -> dict:
    """Call Google Maps Distance Matrix API."""
    if not settings.GOOGLE_MAPS_API_KEY:
        logger.warning("GOOGLE_MAPS_API_KEY not set — returning empty distance matrix")
        return {}

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": "|".join(origins),
        "destinations": "|".join(destinations),
        "key": settings.GOOGLE_MAPS_API_KEY,
        "units": "metric",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(url, params=params)
            return resp.json()
        except Exception as e:
            logger.error(f"Google Maps API error: {e}")
            return {}
