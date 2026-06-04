"""Add accuracy column to gps_waypoints

Revision ID: 011
Revises: 010
Create Date: 2026-06-04
"""
from alembic import op

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # IF NOT EXISTS makes this safe to run even if the column already exists
    op.execute("""
        ALTER TABLE gps_waypoints
        ADD COLUMN IF NOT EXISTS accuracy NUMERIC(8, 2)
    """)


def downgrade() -> None:
    op.drop_column('gps_waypoints', 'accuracy')
