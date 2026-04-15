from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.activity_type import ActivityType
from app.schemas.activity_type import ActivityTypeCreate, ActivityTypeUpdate

# 54 built-in activity types seeded on first run
SEED_ACTIVITY_TYPES = [
    # Marketing Pre-season
    {"name": "Farmer Meeting", "department": "Marketing", "season": "Pre-season"},
    {"name": "Individual Contact", "department": "Marketing", "season": "Pre-season"},
    {"name": "Postering", "department": "Marketing", "season": "Pre-season"},
    {"name": "Jeep Campaign", "department": "Marketing", "season": "Pre-season"},
    {"name": "Mega Farmer Meeting", "department": "Marketing", "season": "Pre-season"},
    {"name": "New Product Demo", "department": "Marketing", "season": "Pre-season"},
    {"name": "Dealer Visit", "department": "Marketing", "season": "Pre-season"},
    {"name": "Dealer Meeting", "department": "Marketing", "season": "Pre-season"},
    # Marketing Post-season
    {"name": "Crop Show", "department": "Marketing", "season": "Post-season"},
    {"name": "Plot Visit", "department": "Marketing", "season": "Post-season"},
    {"name": "Testimonial Collection", "department": "Marketing", "season": "Post-season"},
    {"name": "Retailer Sale Data", "department": "Marketing", "season": "Post-season"},
    {"name": "Shop Painting", "department": "Marketing", "season": "Post-season"},
    {"name": "Wall Painting", "department": "Marketing", "season": "Post-season"},
    {"name": "Farmer Feedback", "department": "Marketing", "season": "Post-season"},
    {"name": "Competitor Analysis", "department": "Marketing", "season": "Post-season"},
    {"name": "Market Survey", "department": "Marketing", "season": "Post-season"},
    {"name": "Yield Data Collection", "department": "Marketing", "season": "Post-season"},
    # Marketing Always
    {"name": "Field Staff Meeting", "department": "Marketing", "season": "Always"},
    {"name": "Complaint Handling", "department": "Marketing", "season": "Always"},
    {"name": "Dealer Stock Check", "department": "Marketing", "season": "Always"},
    {"name": "Payment Collection", "department": "Marketing", "season": "Always"},
    {"name": "New Dealer Onboarding", "department": "Marketing", "season": "Always"},
    {"name": "Brand Promotion", "department": "Marketing", "season": "Always"},
    # Production
    {"name": "Foundation Seed Distribution", "department": "Production", "season": None},
    {"name": "Field Inspection", "department": "Production", "season": None},
    {"name": "Roughing", "department": "Production", "season": None},
    {"name": "Harvesting", "department": "Production", "season": None},
    {"name": "Transport and Storage", "department": "Production", "season": None},
    {"name": "Crop Monitoring", "department": "Production", "season": None},
    {"name": "Irrigation Management", "department": "Production", "season": None},
    {"name": "Pest Control", "department": "Production", "season": None},
    {"name": "Fertilizer Application", "department": "Production", "season": None},
    # R&D
    {"name": "Nursery Bed Preparation", "department": "R&D", "season": None},
    {"name": "Sowing", "department": "R&D", "season": None},
    {"name": "Transplanting", "department": "R&D", "season": None},
    {"name": "Yield Data Recording", "department": "R&D", "season": None},
    {"name": "GOT (Germination On Test)", "department": "R&D", "season": None},
    {"name": "Variety Trial", "department": "R&D", "season": None},
    {"name": "Hybrid Development", "department": "R&D", "season": None},
    {"name": "Parent Line Maintenance", "department": "R&D", "season": None},
    {"name": "Disease Resistance Test", "department": "R&D", "season": None},
    {"name": "Quality Analysis", "department": "R&D", "season": None},
    # Processing
    {"name": "Licencing Validity Check", "department": "Processing", "season": None},
    {"name": "Seed Processing Intake", "department": "Processing", "season": None},
    {"name": "Seed Processing Register", "department": "Processing", "season": None},
    {"name": "Seed Grading", "department": "Processing", "season": None},
    {"name": "Seed Treatment", "department": "Processing", "season": None},
    {"name": "Packaging", "department": "Processing", "season": None},
    {"name": "Quality Control Check", "department": "Processing", "season": None},
    {"name": "Batch Labelling", "department": "Processing", "season": None},
    {"name": "Dispatch Preparation", "department": "Processing", "season": None},
    {"name": "Storage Audit", "department": "Processing", "season": None},
    {"name": "Stock Reconciliation", "department": "Processing", "season": None},
    {"name": "Compliance Documentation", "department": "Processing", "season": None},
]


async def seed_activity_types(db: AsyncSession) -> None:
    """Idempotent seed: only inserts if table is empty."""
    count_result = await db.execute(select(ActivityType))
    if count_result.scalars().first():
        return
    for item in SEED_ACTIVITY_TYPES:
        db.add(ActivityType(**item))
    await db.commit()


async def list_activity_types(db: AsyncSession, department: str | None = None) -> list[ActivityType]:
    q = select(ActivityType).where(ActivityType.is_active == True)  # noqa: E712
    if department:
        q = q.where(ActivityType.department == department)
    result = await db.execute(q)
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
