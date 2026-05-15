"""Add activity_attributes, farmer_feedback, farmer_feedback_responses, activity_media tables

Revision ID: 009
Revises: 008
Create Date: 2026-05-06
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # All CREATE TABLE/INDEX statements use IF NOT EXISTS so this migration is
    # safe to re-run when pgbouncer previously committed the DDL but rolled back
    # the alembic_version update (transaction-mode pooler quirk).
    op.execute("""
        CREATE TABLE IF NOT EXISTS activity_attributes (
            id          SERIAL PRIMARY KEY,
            activity_type_id INTEGER NOT NULL
                REFERENCES activity_types(id) ON DELETE CASCADE,
            label       VARCHAR(200) NOT NULL,
            field_key   VARCHAR(100) NOT NULL,
            field_type  VARCHAR(50)  NOT NULL,
            is_required BOOLEAN NOT NULL DEFAULT false,
            options     JSON,
            placeholder VARCHAR(300),
            sort_order  INTEGER NOT NULL DEFAULT 0,
            is_active   BOOLEAN NOT NULL DEFAULT true,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_activity_attributes_activity_type_id
            ON activity_attributes (activity_type_id)
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS farmer_feedback (
            id               SERIAL PRIMARY KEY,
            activity_type_id INTEGER NOT NULL REFERENCES activity_types(id),
            submitted_by     UUID    NOT NULL REFERENCES users(id),
            farmer_name      VARCHAR(200) NOT NULL,
            farmer_phone     VARCHAR(20),
            village          VARCHAR(200),
            district_id      VARCHAR REFERENCES districts(id),
            location_lat     NUMERIC(9, 6),
            location_lng     NUMERIC(9, 6),
            notes            TEXT,
            status           VARCHAR(20) NOT NULL DEFAULT 'submitted',
            local_id         VARCHAR(100),
            submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_farmer_feedback_submitted_by ON farmer_feedback (submitted_by)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_farmer_feedback_activity_type_id ON farmer_feedback (activity_type_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_farmer_feedback_submitted_at ON farmer_feedback (submitted_at)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS farmer_feedback_responses (
            id          SERIAL PRIMARY KEY,
            feedback_id INTEGER NOT NULL
                REFERENCES farmer_feedback(id) ON DELETE CASCADE,
            field_key   VARCHAR(100) NOT NULL,
            value_text  TEXT,
            value_json  JSON,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_farmer_feedback_responses_feedback_id
            ON farmer_feedback_responses (feedback_id)
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS activity_media (
            id          SERIAL PRIMARY KEY,
            feedback_id INTEGER NOT NULL
                REFERENCES farmer_feedback(id) ON DELETE CASCADE,
            field_key   VARCHAR(100) NOT NULL,
            media_url   TEXT NOT NULL,
            media_type  VARCHAR(20) NOT NULL DEFAULT 'image',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_activity_media_feedback_id ON activity_media (feedback_id)")


def downgrade() -> None:
    op.drop_table('activity_media')
    op.drop_table('farmer_feedback_responses')
    op.drop_table('farmer_feedback')
    op.drop_table('activity_attributes')
