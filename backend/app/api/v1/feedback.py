from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
import base64

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.feedback import (
    ActivityAttributeOut,
    ActivityAttributeCreate,
    FarmerFeedbackCreate,
    FarmerFeedbackOut,
    FarmerFeedbackListOut,
)
from app.services import feedback_service

router = APIRouter()


# ── Attributes ────────────────────────────────────────────────────────────────

@router.get("/activity-types/{activity_type_id}/attributes", response_model=list[ActivityAttributeOut])
async def get_attributes(
    activity_type_id: int,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list:
    return await feedback_service.list_attributes(db, activity_type_id)


@router.post("/attributes", response_model=ActivityAttributeOut, status_code=status.HTTP_201_CREATED)
async def create_attribute(
    body: ActivityAttributeCreate,
    _: Annotated[User, Depends(require_roles("OWNER"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await feedback_service.create_attribute(body, db)


# ── Submissions ───────────────────────────────────────────────────────────────

@router.post("/submissions", response_model=FarmerFeedbackOut, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    body: FarmerFeedbackCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    return await feedback_service.create_feedback(body, current_user.id, db)


@router.get("/submissions", response_model=list[FarmerFeedbackListOut])
async def list_submissions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    activity_type_id: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=200),
) -> list:
    return await feedback_service.list_feedback(db, current_user.id, activity_type_id, skip, limit)


@router.get("/submissions/{feedback_id}", response_model=FarmerFeedbackOut)
async def get_submission(
    feedback_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> object:
    fb = await feedback_service.get_feedback(db, feedback_id, current_user.id)
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    return fb


# ── Media upload ─────────────────────────────────────────────────────────────

@router.post("/media/upload")
async def upload_media(
    feedback_id: int = Form(...),
    field_key: str = Form(...),
    file: UploadFile = File(...),
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> dict:
    # Verify submission belongs to this user
    fb = await feedback_service.get_feedback(db, feedback_id, current_user.id)
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    content = await file.read()
    b64 = base64.b64encode(content).decode()
    data_url = f"data:{file.content_type or 'image/jpeg'};base64,{b64}"

    media = await feedback_service.save_media(feedback_id, field_key, data_url, "image", db)
    return {"id": media.id, "field_key": field_key, "media_url": data_url}
