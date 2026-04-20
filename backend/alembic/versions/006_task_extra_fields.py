"""Add season, state, territory, month, location to tasks

Revision ID: 006
Revises: 005
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tasks', sa.Column('season', sa.String(), nullable=True))
    op.add_column('tasks', sa.Column('state', sa.String(), nullable=True))
    op.add_column('tasks', sa.Column('territory', sa.String(), nullable=True))
    op.add_column('tasks', sa.Column('month', sa.String(), nullable=True))
    op.add_column('tasks', sa.Column('location', sa.String(), nullable=True))


def downgrade():
    op.drop_column('tasks', 'location')
    op.drop_column('tasks', 'month')
    op.drop_column('tasks', 'territory')
    op.drop_column('tasks', 'state')
    op.drop_column('tasks', 'season')
