"""add description to tasks

Revision ID: 003
Revises: 002
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tasks', sa.Column('description', sa.String(), nullable=True))


def downgrade():
    op.drop_column('tasks', 'description')
