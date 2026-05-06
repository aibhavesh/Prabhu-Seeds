"""Initial schema — all 18 tables

Revision ID: 001
Revises:
Create Date: 2026-04-10

Tables created (in dependency order):
  1.  users
  2.  districts
  3.  district_assignments
  4.  dealers
  5.  dealer_assignments
  6.  products
  7.  orders
  8.  order_items
  9.  tasks
  10. task_records
  11. attendance
  12. gps_waypoints
  13. expenses
  14. leaves
  15. activity_types
  16. notifications
  17. audit_log
  18. user_consents
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # 1. users                                                             #
    # ------------------------------------------------------------------ #
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "role", sa.String(), nullable=False,
            comment="OWNER | MANAGER | FIELD | ACCOUNTS",
        ),
        sa.Column("manager_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("state", sa.String(), nullable=True),
        sa.Column("hq", sa.String(), nullable=True),
        sa.Column("mobile", sa.String(), nullable=False, unique=True),
        sa.Column("ppk_rate", sa.Numeric(4, 1), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("manager_id != id", name="ck_users_no_self_manager"),
    )
    op.create_index("ix_users_mobile", "users", ["mobile"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_manager_id", "users", ["manager_id"])

    # ------------------------------------------------------------------ #
    # 2. districts                                                         #
    # ------------------------------------------------------------------ #
    op.create_table(
        "districts",
        sa.Column("id", sa.String(), primary_key=True, comment="slug e.g. mahasamund"),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("state", sa.String(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_districts_state", "districts", ["state"])

    # ------------------------------------------------------------------ #
    # 3. district_assignments                                              #
    # ------------------------------------------------------------------ #
    op.create_table(
        "district_assignments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("district_id", sa.String(), sa.ForeignKey("districts.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("user_id", "district_id", name="uq_district_assignments"),
    )
    op.create_index("ix_district_assignments_user_id", "district_assignments", ["user_id"])
    op.create_index("ix_district_assignments_district_id", "district_assignments", ["district_id"])

    # ------------------------------------------------------------------ #
    # 4. dealers                                                           #
    # ------------------------------------------------------------------ #
    op.create_table(
        "dealers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("district_id", sa.String(), sa.ForeignKey("districts.id"), nullable=True),
        sa.Column("contact", sa.String(), nullable=True),
        sa.Column("mobile", sa.String(), nullable=True),
        sa.Column("added_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_dealers_district_id", "dealers", ["district_id"])
    op.create_index("ix_dealers_added_by", "dealers", ["added_by"])

    # ------------------------------------------------------------------ #
    # 5. dealer_assignments                                                #
    # ------------------------------------------------------------------ #
    op.create_table(
        "dealer_assignments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("dealer_id", sa.Integer(), sa.ForeignKey("dealers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("dealer_id", "user_id", name="uq_dealer_assignments"),
    )
    op.create_index("ix_dealer_assignments_dealer_id", "dealer_assignments", ["dealer_id"])
    op.create_index("ix_dealer_assignments_user_id", "dealer_assignments", ["user_id"])

    # ------------------------------------------------------------------ #
    # 6. products                                                          #
    # ------------------------------------------------------------------ #
    op.create_table(
        "products",
        sa.Column("id", sa.String(), primary_key=True, comment="e.g. P001"),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("crop", sa.String(), nullable=True),
        sa.Column("season", sa.String(), nullable=True, comment="Kharif | Rabi | Zaid"),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("stock", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_products_category", "products", ["category"])
    op.create_index("ix_products_crop", "products", ["crop"])

    # ------------------------------------------------------------------ #
    # 7. orders                                                            #
    # ------------------------------------------------------------------ #
    op.create_table(
        "orders",
        sa.Column("id", sa.String(), primary_key=True, comment="ORD-001 format"),
        sa.Column("dealer_id", sa.Integer(), sa.ForeignKey("dealers.id"), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("date", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
        sa.Column(
            "status", sa.String(), nullable=False, server_default=sa.text("'pending'"),
            comment="pending | dispatched | delivered",
        ),
        sa.Column("paid", sa.Numeric(10, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("status IN ('pending','dispatched','delivered')", name="ck_orders_status"),
    )
    op.create_index("ix_orders_dealer_id", "orders", ["dealer_id"])
    op.create_index("ix_orders_created_by", "orders", ["created_by"])
    op.create_index("ix_orders_date", "orders", ["date"])
    op.create_index("ix_orders_status", "orders", ["status"])

    # ------------------------------------------------------------------ #
    # 8. order_items                                                       #
    # ------------------------------------------------------------------ #
    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.String(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.String(), sa.ForeignKey("products.id"), nullable=True),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("rate", sa.Numeric(8, 2), nullable=False),
        sa.CheckConstraint("qty > 0", name="ck_order_items_qty_positive"),
        sa.CheckConstraint("rate >= 0", name="ck_order_items_rate_non_negative"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])

    # ------------------------------------------------------------------ #
    # 9. tasks                                                             #
    # ------------------------------------------------------------------ #
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("district_id", sa.String(), sa.ForeignKey("districts.id"), nullable=True),
        sa.Column("dept", sa.String(), nullable=True, comment="Marketing | Production | R&D | Processing"),
        sa.Column("activity_type", sa.String(), nullable=True),
        sa.Column("crop", sa.String(), nullable=True),
        sa.Column("product", sa.String(), nullable=True),
        sa.Column("target", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("unit", sa.String(), nullable=False, server_default=sa.text("'NOS'"), comment="NOS | DAYS | KG"),
        sa.Column(
            "status", sa.String(), nullable=False, server_default=sa.text("'assigned'"),
            comment="assigned | running | hold | completed",
        ),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("started_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("status IN ('assigned','running','hold','completed')", name="ck_tasks_status"),
        sa.CheckConstraint("unit IN ('NOS','DAYS','KG')", name="ck_tasks_unit"),
    )
    op.create_index("ix_tasks_assigned_to", "tasks", ["assigned_to"])
    op.create_index("ix_tasks_created_by", "tasks", ["created_by"])
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_district_id", "tasks", ["district_id"])

    # ------------------------------------------------------------------ #
    # 10. task_records                                                     #
    # ------------------------------------------------------------------ #
    op.create_table(
        "task_records",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("submitted_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("village", sa.String(), nullable=True),
        sa.Column("tehsil", sa.String(), nullable=True),
        sa.Column("district", sa.String(), nullable=True),
        sa.Column("farmer_name", sa.String(), nullable=True),
        sa.Column("farmer_contact", sa.String(), nullable=True),
        sa.Column("land_acres", sa.Numeric(6, 2), nullable=True),
        sa.Column("photo_url", sa.String(), nullable=True),
        sa.Column("submitted_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_task_records_task_id", "task_records", ["task_id"])
    op.create_index("ix_task_records_submitted_by", "task_records", ["submitted_by"])

    # ------------------------------------------------------------------ #
    # 11. attendance                                                       #
    # ------------------------------------------------------------------ #
    op.create_table(
        "attendance",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("check_in", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("check_out", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("km", sa.Numeric(6, 1), nullable=False, server_default=sa.text("0")),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'active'"), comment="active | done"),
        sa.UniqueConstraint("user_id", "date", name="uq_attendance_user_date"),
        sa.CheckConstraint("status IN ('active','done')", name="ck_attendance_status"),
    )
    op.create_index("ix_attendance_user_id", "attendance", ["user_id"])
    op.create_index("ix_attendance_date", "attendance", ["date"])

    # ------------------------------------------------------------------ #
    # 12. gps_waypoints                                                    #
    # ------------------------------------------------------------------ #
    op.create_table(
        "gps_waypoints",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("attendance_id", sa.Integer(), sa.ForeignKey("attendance.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lat", sa.Numeric(10, 7), nullable=False),
        sa.Column("lng", sa.Numeric(10, 7), nullable=False),
        sa.Column("timestamp", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("stop_label", sa.String(), nullable=True),
        sa.Column("type", sa.String(), nullable=True, comment="checkin | checkout | stop | break"),
        sa.CheckConstraint("type IN ('checkin','checkout','stop','break')", name="ck_gps_waypoints_type"),
    )
    op.create_index("ix_gps_waypoints_attendance_id", "gps_waypoints", ["attendance_id"])
    op.create_index("ix_gps_waypoints_timestamp", "gps_waypoints", ["timestamp"])

    # ------------------------------------------------------------------ #
    # 13. expenses                                                         #
    # ------------------------------------------------------------------ #
    op.create_table(
        "expenses",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("type", sa.String(), nullable=False, comment="travel | hotel | food | other"),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("amount", sa.Numeric(8, 2), nullable=False),
        sa.Column("km", sa.Numeric(6, 1), nullable=True),
        sa.Column("rate", sa.Numeric(4, 2), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'pending'"), comment="pending | approved | rejected"),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("bill_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("type IN ('travel','hotel','food','other')", name="ck_expenses_type"),
        sa.CheckConstraint("status IN ('pending','approved','rejected')", name="ck_expenses_status"),
        sa.CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
    )
    op.create_index("ix_expenses_user_id", "expenses", ["user_id"])
    op.create_index("ix_expenses_date", "expenses", ["date"])
    op.create_index("ix_expenses_status", "expenses", ["status"])

    # ------------------------------------------------------------------ #
    # 14. leaves                                                           #
    # ------------------------------------------------------------------ #
    op.create_table(
        "leaves",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("from_date", sa.Date(), nullable=False),
        sa.Column("to_date", sa.Date(), nullable=False),
        sa.Column("type", sa.String(), nullable=False, comment="casual | sick | earned | unpaid"),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'pending'"), comment="pending | approved | rejected"),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("type IN ('casual','sick','earned','unpaid')", name="ck_leaves_type"),
        sa.CheckConstraint("status IN ('pending','approved','rejected')", name="ck_leaves_status"),
        sa.CheckConstraint("to_date >= from_date", name="ck_leaves_date_range"),
    )
    op.create_index("ix_leaves_user_id", "leaves", ["user_id"])
    op.create_index("ix_leaves_status", "leaves", ["status"])

    # ------------------------------------------------------------------ #
    # 15. activity_types                                                   #
    # ------------------------------------------------------------------ #
    op.create_table(
        "activity_types",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("department", sa.String(), nullable=False, comment="Marketing | Production | R&D | Processing"),
        sa.Column("season", sa.String(), nullable=True, comment="Pre-season | Post-season | Always"),
        sa.Column("fields_schema", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_activity_types_department", "activity_types", ["department"])

    # ------------------------------------------------------------------ #
    # 16. notifications                                                    #
    # ------------------------------------------------------------------ #
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(), nullable=False, comment="task_assigned | leave_approved | travel_claim_status | general"),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column("read_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_read_at", "notifications", ["read_at"])

    # ------------------------------------------------------------------ #
    # 17. audit_log                                                        #
    # ------------------------------------------------------------------ #
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(), nullable=False, comment="created | updated | deleted | approved | rejected"),
        sa.Column("table_name", sa.String(), nullable=False),
        sa.Column("record_id", sa.String(), nullable=False),
        sa.Column("diff", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("changed_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_audit_log_user_id", "audit_log", ["user_id"])
    op.create_index("ix_audit_log_table_name", "audit_log", ["table_name"])
    op.create_index("ix_audit_log_changed_at", "audit_log", ["changed_at"])

    # ------------------------------------------------------------------ #
    # 18. user_consents                                                    #
    # ------------------------------------------------------------------ #
    op.create_table(
        "user_consents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("consent_type", sa.String(), nullable=False, comment="data_collection | farmer_data | gps_tracking"),
        sa.Column("consent_given", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("timestamp", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("user_id", "consent_type", name="uq_user_consents"),
    )
    op.create_index("ix_user_consents_user_id", "user_consents", ["user_id"])


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_table("user_consents")
    op.drop_table("audit_log")
    op.drop_table("notifications")
    op.drop_table("activity_types")
    op.drop_table("leaves")
    op.drop_table("expenses")
    op.drop_table("gps_waypoints")
    op.drop_table("attendance")
    op.drop_table("task_records")
    op.drop_table("tasks")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("products")
    op.drop_table("dealer_assignments")
    op.drop_table("dealers")
    op.drop_table("district_assignments")
    op.drop_table("districts")
    op.drop_table("users")
