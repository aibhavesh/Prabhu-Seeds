from pydantic import BaseModel
from decimal import Decimal


class KPICard(BaseModel):
    label: str
    value: int | float | Decimal | str
    unit: str | None = None


class DepartmentStat(BaseModel):
    department: str
    total_tasks: int
    completed_tasks: int
    completion_rate: float


class TeamMemberStat(BaseModel):
    user_id: str
    name: str
    total_tasks: int
    completed_tasks: int
    attendance_days: int
    travel_km: float


class StateStat(BaseModel):
    state: str
    active_staff: int
    total_tasks: int
    completed_tasks: int
    completion_rate: float


class DashboardAnalytics(BaseModel):
    kpis: list[KPICard]
    by_department: list[DepartmentStat]
    by_state: list[StateStat]
    top_performers: list[TeamMemberStat]
