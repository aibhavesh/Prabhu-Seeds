import uuid
from datetime import date as date_type
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderItem
from app.models.dealer import Dealer, DealerAssignment
from app.schemas.order import OrderCreate, OrderUpdate
from app.services.visibility import get_subordinate_ids, can_see_dealer


async def _next_order_id(db: AsyncSession) -> str:
    result = await db.execute(select(func.count()).select_from(Order))
    count = result.scalar() or 0
    return f"ORD-{count + 1:03d}"


async def list_orders(user: "User", db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Order]:  # type: ignore[name-defined]
    sub_ids = await get_subordinate_ids(user.id, db)

    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.dealer).selectinload(Dealer.assignments))
        .offset(skip)
        .limit(limit)
    )
    orders = list(result.scalars().all())

    if user.role == "OWNER":
        return orders

    visible = []
    for order in orders:
        dealer = order.dealer
        if dealer:
            assigned_ids = [a.user_id for a in dealer.assignments]
            if can_see_dealer(dealer.added_by, assigned_ids, user.id, user.role, sub_ids):
                visible.append(order)
    return visible


async def create_order(data: OrderCreate, created_by: uuid.UUID, db: AsyncSession) -> Order:
    order_id = await _next_order_id(db)
    order = Order(
        id=order_id,
        dealer_id=data.dealer_id,
        created_by=created_by,
        date=data.date or date_type.today(),
    )
    db.add(order)
    await db.flush()
    for item in data.items:
        db.add(OrderItem(order_id=order_id, **item.model_dump()))
    await db.commit()
    await db.refresh(order)
    return order


async def update_order(order_id: str, data: OrderUpdate, db: AsyncSession) -> Order | None:
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        return None

    STATUS_FLOW = {"pending": 1, "dispatched": 2, "delivered": 3}
    if data.status:
        current_rank = STATUS_FLOW.get(order.status, 0)
        new_rank = STATUS_FLOW.get(data.status, 0)
        if new_rank <= current_rank:
            raise ValueError(f"Cannot move order from '{order.status}' to '{data.status}'")
        order.status = data.status

    if data.paid is not None:
        total_result = await db.execute(
            select(func.sum(OrderItem.qty * OrderItem.rate)).where(OrderItem.order_id == order_id)
        )
        total = total_result.scalar() or Decimal("0")
        order.paid = min(data.paid, total)

    await db.commit()
    await db.refresh(order)
    return order
