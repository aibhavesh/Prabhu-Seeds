import httpx
import math
from loguru import logger
from app.core.config import settings


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two GPS coordinates in km (Haversine formula)."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_route_km(waypoints: list[tuple[float, float]]) -> float:
    """Sum Haversine distances across a list of (lat, lng) waypoints."""
    total = 0.0
    for i in range(len(waypoints) - 1):
        total += haversine_km(*waypoints[i], *waypoints[i + 1])
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
