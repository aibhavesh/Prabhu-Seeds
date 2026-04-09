from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.redis import get_redis
from app.models.user import User
from app.schemas.maps import DirectionsRequest, DirectionsResponse, GeocodeRequest, GeocodeResponse, DistanceMatrixRequest, DistanceMatrixResponse
from app.services import maps_service

router = APIRouter()


@router.post("/directions", response_model=DirectionsResponse)
async def get_directions(
    body: DirectionsRequest,
    _: Annotated[User, Depends(get_current_user)],
    redis=Depends(get_redis),
) -> dict:
    try:
        return await maps_service.get_directions(
            float(body.origin_lat), float(body.origin_lng),
            float(body.destination_lat), float(body.destination_lng),
            redis=redis,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode(
    body: GeocodeRequest,
    _: Annotated[User, Depends(get_current_user)],
    redis=Depends(get_redis),
) -> dict:
    try:
        return await maps_service.geocode_address(body.address, redis=redis)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


@router.post("/distance-matrix", response_model=DistanceMatrixResponse)
async def distance_matrix(
    body: DistanceMatrixRequest,
    _: Annotated[User, Depends(get_current_user)],
    redis=Depends(get_redis),
) -> dict:
    result = await maps_service.get_distance_matrix(body.origins, body.destinations, redis=redis)
    return result
