-- =============================================================================
-- Row-Level Security policies for PGA AgriTask
--
-- Architecture note:
--   The FastAPI backend connects with the service-role key (bypasses RLS).
--   These policies are a defence-in-depth guard if the frontend ever makes
--   direct Supabase/PostgREST calls, or if you add Supabase Realtime.
--
-- JWT claim expected: { "sub": "<uuid>", "role": "OWNER|MANAGER|FIELD|ACCOUNTS" }
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: recursive subordinate check
-- Returns TRUE if `target_uuid` is a direct or indirect report of `manager_uuid`.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_subordinate(manager_uuid uuid, target_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH RECURSIVE subs AS (
    SELECT id FROM users WHERE manager_id = manager_uuid
    UNION ALL
    SELECT u.id FROM users u JOIN subs s ON u.manager_id = s.id
  )
  SELECT EXISTS (SELECT 1 FROM subs WHERE id = target_uuid);
$$;

-- Helper: current user's role from JWT
CREATE OR REPLACE FUNCTION current_role_claim()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', '');
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on all application tables
-- ---------------------------------------------------------------------------
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_waypoints       ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves              ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents       ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
-- OWNER: see everyone
CREATE POLICY users_owner_select ON users FOR SELECT
  USING (current_role_claim() = 'OWNER');

-- MANAGER: see self + direct/indirect reports
CREATE POLICY users_manager_select ON users FOR SELECT
  USING (
    current_role_claim() = 'MANAGER'
    AND (id = auth.uid() OR is_subordinate(auth.uid(), id))
  );

-- FIELD / ACCOUNTS: see only themselves
CREATE POLICY users_self_select ON users FOR SELECT
  USING (id = auth.uid());

-- Only OWNER can insert/update/delete users
CREATE POLICY users_owner_write ON users FOR ALL
  USING (current_role_claim() = 'OWNER');

-- ---------------------------------------------------------------------------
-- ATTENDANCE
-- ---------------------------------------------------------------------------
CREATE POLICY attendance_owner ON attendance FOR SELECT
  USING (current_role_claim() = 'OWNER');

CREATE POLICY attendance_manager ON attendance FOR SELECT
  USING (
    current_role_claim() = 'MANAGER'
    AND (user_id = auth.uid() OR is_subordinate(auth.uid(), user_id))
  );

CREATE POLICY attendance_self ON attendance FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY attendance_insert_self ON attendance FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY attendance_update_self ON attendance FOR UPDATE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- GPS WAYPOINTS (via attendance)
-- ---------------------------------------------------------------------------
CREATE POLICY waypoints_own ON gps_waypoints FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM attendance a
      WHERE a.id = attendance_id
        AND (
          current_role_claim() = 'OWNER'
          OR a.user_id = auth.uid()
          OR (current_role_claim() = 'MANAGER' AND is_subordinate(auth.uid(), a.user_id))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- TASKS
-- ---------------------------------------------------------------------------
CREATE POLICY tasks_owner ON tasks FOR SELECT
  USING (current_role_claim() = 'OWNER');

CREATE POLICY tasks_manager ON tasks FOR SELECT
  USING (
    current_role_claim() = 'MANAGER'
    AND (
      created_by = auth.uid()
      OR assigned_to = auth.uid()
      OR is_subordinate(auth.uid(), assigned_to)
      OR is_subordinate(auth.uid(), created_by)
    )
  );

CREATE POLICY tasks_field ON tasks FOR SELECT
  USING (
    current_role_claim() IN ('FIELD', 'ACCOUNTS')
    AND (assigned_to = auth.uid() OR created_by = auth.uid())
  );

CREATE POLICY tasks_create ON tasks FOR INSERT
  WITH CHECK (
    current_role_claim() IN ('OWNER', 'MANAGER')
    AND created_by = auth.uid()
  );

CREATE POLICY tasks_update ON tasks FOR UPDATE
  USING (
    current_role_claim() IN ('OWNER', 'MANAGER')
    OR assigned_to = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- TASK RECORDS
-- ---------------------------------------------------------------------------
CREATE POLICY task_records_select ON task_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
        AND (
          current_role_claim() = 'OWNER'
          OR t.assigned_to = auth.uid()
          OR t.created_by = auth.uid()
          OR (current_role_claim() = 'MANAGER' AND (
            is_subordinate(auth.uid(), t.assigned_to)
            OR is_subordinate(auth.uid(), t.created_by)
          ))
        )
    )
  );

CREATE POLICY task_records_insert ON task_records FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

-- ---------------------------------------------------------------------------
-- EXPENSES
-- ---------------------------------------------------------------------------
CREATE POLICY expenses_owner ON expenses FOR SELECT
  USING (current_role_claim() = 'OWNER');

CREATE POLICY expenses_manager ON expenses FOR SELECT
  USING (
    current_role_claim() = 'MANAGER'
    AND (user_id = auth.uid() OR is_subordinate(auth.uid(), user_id))
  );

CREATE POLICY expenses_self ON expenses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY expenses_insert_self ON expenses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY expenses_approve ON expenses FOR UPDATE
  USING (current_role_claim() IN ('OWNER', 'MANAGER'));

-- ---------------------------------------------------------------------------
-- LEAVES
-- ---------------------------------------------------------------------------
CREATE POLICY leaves_owner ON leaves FOR SELECT
  USING (current_role_claim() = 'OWNER');

CREATE POLICY leaves_manager ON leaves FOR SELECT
  USING (
    current_role_claim() = 'MANAGER'
    AND (user_id = auth.uid() OR is_subordinate(auth.uid(), user_id))
  );

CREATE POLICY leaves_self ON leaves FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY leaves_insert_self ON leaves FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY leaves_approve ON leaves FOR UPDATE
  USING (current_role_claim() IN ('OWNER', 'MANAGER'));

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS (only own)
-- ---------------------------------------------------------------------------
CREATE POLICY notifications_self ON notifications FOR ALL
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- PRODUCTS (read by all authenticated; write by OWNER/ACCOUNTS)
-- ---------------------------------------------------------------------------
CREATE POLICY products_read ON products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY products_write ON products FOR ALL
  USING (current_role_claim() IN ('OWNER', 'ACCOUNTS'));

-- ---------------------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------------------
CREATE POLICY orders_owner ON orders FOR SELECT
  USING (current_role_claim() = 'OWNER');

CREATE POLICY orders_manager ON orders FOR SELECT
  USING (
    current_role_claim() IN ('MANAGER', 'ACCOUNTS')
    AND (
      created_by = auth.uid()
      OR is_subordinate(auth.uid(), created_by)
    )
  );

CREATE POLICY orders_field ON orders FOR SELECT
  USING (
    current_role_claim() = 'FIELD'
    AND created_by = auth.uid()
  );

CREATE POLICY orders_insert ON orders FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY orders_update ON orders FOR UPDATE
  USING (current_role_claim() IN ('OWNER', 'ACCOUNTS'));

-- ---------------------------------------------------------------------------
-- ORDER ITEMS (access mirrors parent order)
-- ---------------------------------------------------------------------------
CREATE POLICY order_items_select ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_id
        AND (
          current_role_claim() = 'OWNER'
          OR o.created_by = auth.uid()
          OR (current_role_claim() IN ('MANAGER', 'ACCOUNTS') AND is_subordinate(auth.uid(), o.created_by))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- DISTRICTS (read by all; write by OWNER)
-- ---------------------------------------------------------------------------
CREATE POLICY districts_read ON districts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY districts_write ON districts FOR ALL
  USING (current_role_claim() = 'OWNER');

-- ---------------------------------------------------------------------------
-- DISTRICT ASSIGNMENTS
-- ---------------------------------------------------------------------------
CREATE POLICY da_select ON district_assignments FOR SELECT
  USING (
    current_role_claim() = 'OWNER'
    OR user_id = auth.uid()
    OR is_subordinate(auth.uid(), user_id)
  );

-- ---------------------------------------------------------------------------
-- DEALERS
-- ---------------------------------------------------------------------------
CREATE POLICY dealers_owner ON dealers FOR SELECT
  USING (current_role_claim() = 'OWNER');

CREATE POLICY dealers_manager ON dealers FOR SELECT
  USING (
    current_role_claim() = 'MANAGER'
    AND (
      added_by = auth.uid()
      OR is_subordinate(auth.uid(), added_by)
      OR EXISTS (
        SELECT 1 FROM dealer_assignments da
        WHERE da.dealer_id = id
          AND (da.user_id = auth.uid() OR is_subordinate(auth.uid(), da.user_id))
      )
    )
  );

CREATE POLICY dealers_field ON dealers FOR SELECT
  USING (
    current_role_claim() = 'FIELD'
    AND EXISTS (
      SELECT 1 FROM dealer_assignments da
      WHERE da.dealer_id = id AND da.user_id = auth.uid()
    )
  );

CREATE POLICY dealers_insert ON dealers FOR INSERT
  WITH CHECK (
    current_role_claim() IN ('OWNER', 'MANAGER', 'FIELD')
    AND added_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- ACTIVITY TYPES (read-only for all)
-- ---------------------------------------------------------------------------
CREATE POLICY activity_types_read ON activity_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY activity_types_write ON activity_types FOR ALL
  USING (current_role_claim() = 'OWNER');

-- ---------------------------------------------------------------------------
-- AUDIT LOG (OWNER only)
-- ---------------------------------------------------------------------------
CREATE POLICY audit_log_owner ON audit_log FOR SELECT
  USING (current_role_claim() = 'OWNER');

-- ---------------------------------------------------------------------------
-- USER CONSENTS (own record)
-- ---------------------------------------------------------------------------
CREATE POLICY user_consents_self ON user_consents FOR ALL
  USING (user_id = auth.uid());
