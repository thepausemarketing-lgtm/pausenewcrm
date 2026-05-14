-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
-- All authenticated users can read all profiles (needed for dropdowns)
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (current_user_role() = 'admin');

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE POLICY "clients_select" ON clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "clients_insert" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'manager'));

CREATE POLICY "clients_update" ON clients
  FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin', 'manager'));

CREATE POLICY "clients_delete" ON clients
  FOR DELETE TO authenticated
  USING (current_user_role() = 'admin');

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE POLICY "contacts_select" ON contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "contacts_insert" ON contacts
  FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'manager'));

CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin', 'manager'));

CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE TO authenticated
  USING (current_user_role() IN ('admin', 'manager'));

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE POLICY "campaigns_select" ON campaigns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "campaigns_insert" ON campaigns
  FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'manager'));

CREATE POLICY "campaigns_update" ON campaigns
  FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin', 'manager'));

CREATE POLICY "campaigns_delete" ON campaigns
  FOR DELETE TO authenticated
  USING (current_user_role() = 'admin');

-- ============================================================
-- CONTENT ITEMS
-- ============================================================
CREATE POLICY "content_items_select" ON content_items
  FOR SELECT TO authenticated USING (true);

-- Members can insert content in draft/in_review only; managers/admins can insert anything
CREATE POLICY "content_items_insert" ON content_items
  FOR INSERT TO authenticated
  WITH CHECK (
    current_user_role() IN ('admin', 'manager')
    OR (current_user_role() = 'member' AND status IN ('draft', 'in_review'))
  );

-- Members can update their own content (primary assignee OR co-assignee via junction table)
-- Managers/admins can update anything
CREATE POLICY "content_items_update" ON content_items
  FOR UPDATE TO authenticated
  USING (
    current_user_role() IN ('admin', 'manager')
    OR (current_user_role() = 'member' AND (
      assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM content_assignees
        WHERE content_assignees.content_item_id = content_items.id
          AND content_assignees.user_id = auth.uid()
      )
    ))
  );

CREATE POLICY "content_items_delete" ON content_items
  FOR DELETE TO authenticated
  USING (current_user_role() IN ('admin', 'manager'));

-- ============================================================
-- TASKS
-- ============================================================
CREATE POLICY "tasks_select" ON tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE TO authenticated
  USING (
    current_user_role() IN ('admin', 'manager')
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE TO authenticated
  USING (current_user_role() IN ('admin', 'manager'));

-- ============================================================
-- TASK COMMENTS
-- ============================================================
CREATE POLICY "task_comments_select" ON task_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "task_comments_insert" ON task_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "task_comments_update" ON task_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "task_comments_delete" ON task_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR current_user_role() IN ('admin', 'manager'));

-- ============================================================
-- ATTACHMENTS
-- ============================================================
CREATE POLICY "attachments_select" ON attachments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "attachments_insert" ON attachments
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "attachments_delete" ON attachments
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR current_user_role() IN ('admin', 'manager'));

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
CREATE POLICY "activity_logs_select" ON activity_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "activity_logs_insert" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
