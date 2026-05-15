"""add repeat_count to tasks

Revision ID: 002
Revises: 001
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('repeat_count', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    op.drop_column('tasks', 'repeat_count')
