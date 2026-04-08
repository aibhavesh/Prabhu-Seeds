import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.district import District, DistrictAssignment
from app.schemas.district import DistrictCreate, DistrictAssignmentCreate


async def list_districts(db: AsyncSession) -> list[District]:
    result = await db.execute(select(District))
    return list(result.scalars().all())


async def create_district(data: DistrictCreate, db: AsyncSession) -> District:
    district = District(**data.model_dump())
    db.add(district)
    await db.commit()
    await db.refresh(district)
    return district


async def assign_district(data: DistrictAssignmentCreate, db: AsyncSession) -> DistrictAssignment:
    assignment = DistrictAssignment(**data.model_dump())
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def unassign_district(user_id: uuid.UUID, district_id: str, db: AsyncSession) -> bool:
    result = await db.execute(
        select(DistrictAssignment).where(
            DistrictAssignment.user_id == user_id,
            DistrictAssignment.district_id == district_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        return False
    await db.delete(assignment)
    await db.commit()
    return True
