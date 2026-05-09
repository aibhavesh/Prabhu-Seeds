"""add journey_start and journey_end to expenses

Revision ID: 008
Revises: 007
Create Date: 2026-05-09

Allows the GPS route viewer to isolate waypoints for a specific journey
when a field agent makes multiple trips on the same day.  Without these
columns every trip on the same day showed the same GPS track because the
route endpoint could only filter by attendance date.
"""
from alembic import op
import sqlalchemy as sa

revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('expenses', sa.Column('journey_start', sa.TIMESTAMP(timezone=True), nullable=True))
    op.add_column('expenses', sa.Column('journey_end',   sa.TIMESTAMP(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('expenses', 'journey_end')
    op.drop_column('expenses', 'journey_start')
