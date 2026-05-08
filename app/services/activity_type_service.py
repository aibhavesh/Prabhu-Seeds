from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.activity_type import ActivityType
from app.schemas.activity_type import ActivityTypeCreate, ActivityTypeUpdate

# Activity types seeded on first run — matches the Backend Task Assignment Form spec exactly
SEED_ACTIVITY_TYPES = [
    # ── Marketing · Pre-Season ──────────────────────────────────────────────
    {"name": "Pre Season Farmer Meeting",       "department": "Marketing", "season": "Pre-Season"},
    {"name": "Individual Farmer Contact",        "department": "Marketing", "season": "Pre-Season"},
    {"name": "Postering",                        "department": "Marketing", "season": "Pre-Season"},
    {"name": "Jeep / Rikshwa / Bike Campaign",   "department": "Marketing", "season": "Pre-Season"},
    {"name": "Mega Farmer Meeting",              "department": "Marketing", "season": "Pre-Season"},
    {"name": "New Product Demo / Dealer Visit",  "department": "Marketing", "season": "Pre-Season"},
    # ── Marketing · Post-Season ─────────────────────────────────────────────
    {"name": "Retailer / Wholesaler Sale Data",  "department": "Marketing", "season": "Post-Season"},
    {"name": "Dealer Product Wise Farmer List",  "department": "Marketing", "season": "Post-Season"},
    {"name": "Crop Show / Mega Crop Show",       "department": "Marketing", "season": "Post-Season"},
    {"name": "Plot Visit / Model Plot Visit",    "department": "Marketing", "season": "Post-Season"},
    {"name": "Live Plant Display / Trail Product","department": "Marketing", "season": "Post-Season"},
    {"name": "Testimonial / Yield Data",         "department": "Marketing", "season": "Post-Season"},
    {"name": "Shop / Wall / Trolly Painting",    "department": "Marketing", "season": "Post-Season"},
    # ── Marketing · Always Active ───────────────────────────────────────────
    {"name": "Complaint Handling",               "department": "Marketing", "season": "Always Active"},
    {"name": "Marketing Staff Meeting",          "department": "Marketing", "season": "Always Active"},
    {"name": "Field Staff Meeting",              "department": "Marketing", "season": "Always Active"},
    {"name": "Other Campaign / Krishi Mela",     "department": "Marketing", "season": "Always Active"},
    # ── Production · Pre-Season ─────────────────────────────────────────────
    {"name": "Foundation Seed Distribution",     "department": "Production", "season": "Pre-Season"},
    {"name": "Nursery Bed Preparation",          "department": "Production", "season": "Pre-Season"},
    {"name": "Sowing",                           "department": "Production", "season": "Pre-Season"},
    # ── Production · Post-Season ────────────────────────────────────────────
    {"name": "Farmers Field Visit / Field Inspection", "department": "Production", "season": "Post-Season"},
    {"name": "Roughing",                         "department": "Production", "season": "Post-Season"},
    {"name": "De-Tasseling / Crossing / Caping", "department": "Production", "season": "Post-Season"},
    {"name": "Harvesting / Transport / Storage", "department": "Production", "season": "Post-Season"},
    {"name": "Seed Available Details for Payment","department": "Production", "season": "Post-Season"},
    # ── Production · Always Active ──────────────────────────────────────────
    {"name": "Complaint Handling",               "department": "Production", "season": "Always Active"},
    {"name": "Marketing Staff Meeting",          "department": "Production", "season": "Always Active"},
    {"name": "Field Staff Meeting",              "department": "Production", "season": "Always Active"},
    {"name": "Other Campaign / Krishi Mela",     "department": "Production", "season": "Always Active"},
    # ── R&D · Pre-Season ────────────────────────────────────────────────────
    {"name": "Nursery Bed Preparation",          "department": "R&D", "season": "Pre-Season"},
    {"name": "Sowing",                           "department": "R&D", "season": "Pre-Season"},
    # ── R&D · Post-Season ───────────────────────────────────────────────────
    {"name": "Transplanting",                    "department": "R&D", "season": "Post-Season"},
    {"name": "Fertilizer Basal Dose",            "department": "R&D", "season": "Post-Season"},
    {"name": "Roughing / Crossing / Caping",     "department": "R&D", "season": "Post-Season"},
    {"name": "Harvesting Male/Female Lines",     "department": "R&D", "season": "Post-Season"},
    {"name": "Yield Data",                       "department": "R&D", "season": "Post-Season"},
    {"name": "Threshing",                        "department": "R&D", "season": "Post-Season"},
    {"name": "Storage",                          "department": "R&D", "season": "Post-Season"},
    {"name": "GOT (No. of Products)",            "department": "R&D", "season": "Post-Season"},
    # ── R&D · Always Active ─────────────────────────────────────────────────
    {"name": "Complaint Handling",               "department": "R&D", "season": "Always Active"},
    {"name": "Marketing Staff Meeting",          "department": "R&D", "season": "Always Active"},
    {"name": "Field Staff Meeting",              "department": "R&D", "season": "Always Active"},
    {"name": "Other Campaign / Krishi Mela",     "department": "R&D", "season": "Always Active"},
]


async def seed_activity_types(db: AsyncSession) -> None:
    """
    Replace all activity types with the canonical spec list.
    Safe to run multiple times — clears and re-inserts on every startup
    so the DB always reflects the current SEED_ACTIVITY_TYPES list.
    """
    from sqlalchemy import delete as sa_delete
    await db.execute(sa_delete(ActivityType))
    for item in SEED_ACTIVITY_TYPES:
        db.add(ActivityType(**item))
    await db.commit()


async def list_activity_types(
    db: AsyncSession,
    department: str | None = None,
    season: str | None = None,
) -> list[ActivityType]:
    q = select(ActivityType).where(ActivityType.is_active == True)  # noqa: E712
    if department:
        q = q.where(ActivityType.department == department)
    if season and season in ("Pre-Season", "Post-Season"):
        # Always Active tasks are visible in every season context
        q = q.where(ActivityType.season.in_([season, "Always Active"]))
    # season == "Always" or None → no extra filter, return full dept list
    result = await db.execute(q.order_by(ActivityType.season, ActivityType.name))
    return list(result.scalars().all())


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
