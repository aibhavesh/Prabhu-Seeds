"""add lat/lng to task_records for completion location tracking

Revision ID: 005
Revises: 004
Create Date: 2026-04-17
"""
from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('task_records', sa.Column('lat', sa.Numeric(9, 6), nullable=True))
    op.add_column('task_records', sa.Column('lng', sa.Numeric(9, 6), nullable=True))


def downgrade() -> None:
    op.drop_column('task_records', 'lng')
    op.drop_column('task_records', 'lat')
