from pydantic import BaseModel
from decimal import Decimal


class LatLng(BaseModel):
    lat: Decimal
    lng: Decimal


class DirectionsRequest(BaseModel):
    origin_lat: Decimal
    origin_lng: Decimal
    destination_lat: Decimal
    destination_lng: Decimal


class DirectionsResponse(BaseModel):
    polyline: list[LatLng]
    distance_km: float
    duration_min: int


class GeocodeRequest(BaseModel):
    address: str


class GeocodeResponse(BaseModel):
    lat: Decimal
    lng: Decimal
    formatted_address: str


class DistanceMatrixRequest(BaseModel):
    origins: list[str]       # "lat,lng" strings
    destinations: list[str]


class DistanceMatrixEntry(BaseModel):
    origin: str
    destination: str
    distance_km: float | None
    duration_min: int | None


class DistanceMatrixResponse(BaseModel):
    results: list[DistanceMatrixEntry]
