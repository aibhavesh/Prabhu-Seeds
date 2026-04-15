import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.dealer import Dealer, DealerAssignment
from app.models.user import User
from app.schemas.dealer import DealerCreate, DealerUpdate
from app.services.visibility import get_subordinate_ids, can_see_dealer


async def list_dealers(
    user: User, db: AsyncSession, skip: int = 0, limit: int = 100
) -> list[Dealer]:
    sub_ids = await get_subordinate_ids(user.id, db)

    result = await db.execute(
        select(Dealer)
        .options(selectinload(Dealer.assignments))
        .offset(skip)
        .limit(limit)
    )
    dealers = list(result.scalars().all())

    if user.role == "OWNER":
        return dealers

    visible = []
    for dealer in dealers:
        assigned_ids = [a.user_id for a in dealer.assignments]
        if can_see_dealer(dealer.added_by, assigned_ids, user.id, user.role, sub_ids):
            visible.append(dealer)
    return visible


async def create_dealer(data: DealerCreate, added_by: uuid.UUID, db: AsyncSession) -> Dealer:
    dealer = Dealer(**data.model_dump(), added_by=added_by)
    db.add(dealer)
    await db.commit()
    await db.refresh(dealer)
    return dealer


async def update_dealer(dealer_id: int, data: DealerUpdate, db: AsyncSession) -> Dealer | None:
    result = await db.execute(select(Dealer).where(Dealer.id == dealer_id))
    dealer = result.scalar_one_or_none()
    if not dealer:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(dealer, field, value)
    await db.commit()
    await db.refresh(dealer)
    return dealer


async def assign_dealer(dealer_id: int, user_id: uuid.UUID, db: AsyncSession) -> DealerAssignment:
    assignment = DealerAssignment(dealer_id=dealer_id, user_id=user_id)
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def unassign_dealer(dealer_id: int, user_id: uuid.UUID, db: AsyncSession) -> bool:
    result = await db.execute(
        select(DealerAssignment)
        .where(DealerAssignment.dealer_id == dealer_id, DealerAssignment.user_id == user_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        return False
    await db.delete(assignment)
    await db.commit()
    return True
