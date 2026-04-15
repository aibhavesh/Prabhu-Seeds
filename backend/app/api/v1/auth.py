from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import OTPSendRequest, OTPVerifyRequest, TokenResponse
from app.schemas.user import UserOut
from app.services import auth_service

router = APIRouter()


@router.post("/send-otp")
@router.post("/otp/send")   # legacy alias
async def send_otp(
    body: OTPSendRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    try:
        result = await auth_service.initiate_otp(body.mobile, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    if not result["success"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["message"])
    return {"message": result["message"]}


@router.post("/verify-otp", response_model=TokenResponse)
@router.post("/otp/verify", response_model=TokenResponse)   # legacy alias
async def verify_otp(
    body: OTPVerifyRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    try:
        result = await auth_service.verify_and_login(body.mobile, body.otp, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    if not result["success"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=result["message"])
    return TokenResponse(**result)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user
