import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.feedback import ActivityAttribute, FarmerFeedback, FarmerFeedbackResponse, ActivityMedia
from app.schemas.feedback import FarmerFeedbackCreate, ActivityAttributeCreate


async def list_attributes(db: AsyncSession, activity_type_id: int) -> list[ActivityAttribute]:
    q = (
        select(ActivityAttribute)
        .where(
            ActivityAttribute.activity_type_id == activity_type_id,
            ActivityAttribute.is_active == True,  # noqa: E712
        )
        .order_by(ActivityAttribute.sort_order, ActivityAttribute.id)
    )
    result = await db.execute(q)
    return list(result.scalars().all())


async def create_attribute(data: ActivityAttributeCreate, db: AsyncSession) -> ActivityAttribute:
    attr = ActivityAttribute(**data.model_dump())
    db.add(attr)
    await db.commit()
    await db.refresh(attr)
    return attr


async def create_feedback(
    data: FarmerFeedbackCreate,
    submitted_by: uuid.UUID,
    db: AsyncSession,
) -> FarmerFeedback:
    feedback = FarmerFeedback(
        activity_type_id=data.activity_type_id,
        submitted_by=submitted_by,
        farmer_name=data.farmer_name,
        farmer_phone=data.farmer_phone,
        village=data.village,
        district_id=data.district_id,
        location_lat=float(data.location_lat) if data.location_lat is not None else None,
        location_lng=float(data.location_lng) if data.location_lng is not None else None,
        notes=data.notes,
        local_id=data.local_id,
        status="submitted",
    )
    db.add(feedback)
    await db.flush()

    for resp in data.responses:
        db.add(FarmerFeedbackResponse(
            feedback_id=feedback.id,
            field_key=resp.field_key,
            value_text=resp.value_text,
            value_json=resp.value_json,
        ))

    await db.commit()

    result = await db.execute(
        select(FarmerFeedback)
        .options(
            selectinload(FarmerFeedback.responses),
            selectinload(FarmerFeedback.media),
        )
        .where(FarmerFeedback.id == feedback.id)
    )
    return result.scalar_one()


async def list_feedback(
    db: AsyncSession,
    submitted_by: uuid.UUID,
    activity_type_id: int | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[FarmerFeedback]:
    q = select(FarmerFeedback).where(FarmerFeedback.submitted_by == submitted_by)
    if activity_type_id:
        q = q.where(FarmerFeedback.activity_type_id == activity_type_id)
    q = q.order_by(FarmerFeedback.submitted_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_feedback(
    db: AsyncSession,
    feedback_id: int,
    submitted_by: uuid.UUID,
) -> FarmerFeedback | None:
    result = await db.execute(
        select(FarmerFeedback)
        .options(
            selectinload(FarmerFeedback.responses),
            selectinload(FarmerFeedback.media),
        )
        .where(
            FarmerFeedback.id == feedback_id,
            FarmerFeedback.submitted_by == submitted_by,
        )
    )
    return result.scalar_one_or_none()


async def save_media(
    feedback_id: int,
    field_key: str,
    media_url: str,
    media_type: str,
    db: AsyncSession,
) -> ActivityMedia:
    media = ActivityMedia(
        feedback_id=feedback_id,
        field_key=field_key,
        media_url=media_url,
        media_type=media_type,
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)
    return media
