from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sa_delete, nulls_last
from app.models.activity_type import ActivityType
from app.models.feedback import ActivityAttribute
from app.schemas.activity_type import ActivityTypeCreate, ActivityTypeUpdate
from app.services.seed_data import SEED_ACTIVITY_TYPES, SEED_ACTIVITY_ATTRIBUTES


async def seed_activity_types(db: AsyncSession) -> None:
    """
    Upsert-based seed: updates existing activity_types in-place and inserts new ones.
    Preserves IDs so farmer_feedback FK references remain valid.
    Replaces the old delete-all approach that broke once farmer_feedback rows existed.
    """
    # 1 — load existing types keyed by (name, department)
    result = await db.execute(select(ActivityType))
    existing: dict[tuple[str, str], ActivityType] = {
        (at.name, at.department): at for at in result.scalars().all()
    }

    # 2 — upsert activity types
    for item in SEED_ACTIVITY_TYPES:
        key = (item["name"], item["department"])
        if key in existing:
            at = existing[key]
            for field, value in item.items():
                setattr(at, field, value)
        else:
            at = ActivityType(**item)
            db.add(at)
            existing[key] = at

    await db.flush()  # assign PKs for newly inserted rows

    # 3 — rebuild (name, department) → id lookup (IDs now stable)
    result = await db.execute(select(ActivityType))
    at_map = {(at.name, at.department): at.id for at in result.scalars().all()}

    # 4 — replace attributes for each seeded activity type
    for (name, dept), attrs in SEED_ACTIVITY_ATTRIBUTES.items():
        at_id = at_map.get((name, dept))
        if not at_id:
            continue
        # Delete existing attributes for this type before re-inserting
        await db.execute(
            sa_delete(ActivityAttribute).where(ActivityAttribute.activity_type_id == at_id)
        )
        for attr in attrs:
            db.add(ActivityAttribute(
                activity_type_id=at_id,
                label=attr["label"],
                field_key=attr["field_key"],
                field_type=attr.get("field_type", "text"),
                is_required=attr.get("is_required", True),
                options=attr.get("options"),
                placeholder=attr.get("placeholder"),
                sort_order=attr.get("sort_order", 0),
            ))

    await db.commit()


async def list_activity_types(
    db: AsyncSession,
    department: str | None = None,
    season: str | None = None,
    numbered_only: bool = False,
) -> list[ActivityType]:
    q = select(ActivityType).where(ActivityType.is_active == True)  # noqa: E712
    if department:
        q = q.where(ActivityType.department == department)
    if season and season in ("Pre-Season", "Post-Season"):
        # Always Active tasks are visible in every season context
        q = q.where(ActivityType.season.in_([season, "Always Active"]))
    if numbered_only:
        # Farmer Feedback module: only numbered activities (activity_number IS NOT NULL)
        q = q.where(ActivityType.activity_number.isnot(None))
    result = await db.execute(
        q.order_by(nulls_last(ActivityType.activity_number), ActivityType.season, ActivityType.name)
    )
    return list(result.scalars().all())


async def list_departments(db: AsyncSession) -> list[dict]:
    """Return distinct departments with their activity counts."""
    result = await db.execute(
        select(ActivityType.department)
        .where(ActivityType.is_active == True)  # noqa: E712
        .distinct()
    )
    depts = [row[0] for row in result.all()]

    out = []
    for dept in depts:
        count_res = await db.execute(
            select(ActivityType).where(
                ActivityType.department == dept,
                ActivityType.is_active == True,  # noqa: E712
            )
        )
        count = len(count_res.scalars().all())
        out.append({"name": dept, "activity_count": count})

    dept_order = {"Marketing": 0, "Production": 1, "R&D": 2, "Processing": 3}
    out.sort(key=lambda d: dept_order.get(d["name"], 99))
    return out


async def create_activity_type(data: ActivityTypeCreate, db: AsyncSession) -> ActivityType:
    at = ActivityType(**data.model_dump())
    db.add(at)
    await db.commit()
    await db.refresh(at)
    return at


async def update_activity_type(at_id: int, data: ActivityTypeUpdate, db: AsyncSession) -> ActivityType | None:
    result = await db.execute(select(ActivityType).where(ActivityType.id == at_id))
    at = result.scalar_one_or_none()
    if not at:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(at, field, value)
    await db.commit()
    await db.refresh(at)
    return at
