"""add assignment_type and task_members table

Revision ID: 004
Revises: 003
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tasks', sa.Column(
        'assignment_type', sa.String(), nullable=False, server_default='singular'
    ))
    op.create_table(
        'task_members',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('task_id', sa.Integer(),
                  sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id'), nullable=False),
    )


def downgrade():
    op.drop_table('task_members')
    op.drop_column('tasks', 'assignment_type')
