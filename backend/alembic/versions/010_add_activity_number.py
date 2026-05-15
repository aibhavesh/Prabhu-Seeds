"""Add activity_number to activity_types; add Processing dept support

Revision ID: 010
Revises: 009
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa

revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE activity_types
        ADD COLUMN IF NOT EXISTS activity_number INTEGER
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_activity_types_department ON activity_types (department)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_activity_types_activity_number ON activity_types (activity_number)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_activity_types_activity_number")
    op.execute("DROP INDEX IF EXISTS ix_activity_types_department")
    op.drop_column('activity_types', 'activity_number')
