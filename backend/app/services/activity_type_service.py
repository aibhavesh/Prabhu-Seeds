import hashlib
import json
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sa_delete, func, nulls_last
from app.models.activity_type import ActivityType
from app.models.feedback import ActivityAttribute
from app.schemas.activity_type import ActivityTypeCreate, ActivityTypeUpdate
from app.services.seed_data import SEED_ACTIVITY_TYPES, SEED_ACTIVITY_ATTRIBUTES

# Compute a stable hash of the seed data at import time.
# If nothing in seed_data.py changed, the hash is identical and we skip the
# expensive DELETE + re-INSERT cycle on every startup.
_SEED_HASH = hashlib.md5(
    json.dumps(
        {"types": SEED_ACTIVITY_TYPES, "attrs": {str(k): v for k, v in SEED_ACTIVITY_ATTRIBUTES.items()}},
        sort_keys=True,
        default=str,
    ).encode()
).hexdigest()

# Store the last-applied hash in a small file next to this module.
_HASH_FILE = os.path.join(os.path.dirname(__file__), ".seed_hash")


def _hash_is_current() -> bool:
    """Return True if the on-disk hash matches the current seed data hash."""
    try:
        return open(_HASH_FILE).read().strip() == _SEED_HASH
    except FileNotFoundError:
        return False


def _write_hash() -> None:
    with open(_HASH_FILE, "w") as f:
        f.write(_SEED_HASH)


async def seed_activity_types(db: AsyncSession) -> None:
    """
    Upsert-based seed: updates existing activity_types in-place and inserts new ones.
    Preserves IDs so farmer_feedback FK references remain valid.

    Skips the full seed if the seed data hash hasn't changed since the last run —
    this prevents the expensive DELETE + re-INSERT cycle on every hot-reload/restart.
    """
    # Fast-path: if seed data is unchanged and types already exist, do nothing.
    if _hash_is_current():
        result = await db.execute(select(func.count()).select_from(ActivityType))
        if (result.scalar() or 0) > 0:
            return  # nothing changed, skip entirely

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
    _write_hash()  # record that this seed version is now applied


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
