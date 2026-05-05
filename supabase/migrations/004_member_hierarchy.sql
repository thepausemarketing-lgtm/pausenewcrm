-- Drop old permissive task select policy
DROP POLICY IF EXISTS "tasks_select" ON tasks;

-- Members only see their own tasks; managers/admins see all
CREATE POLICY "tasks_select" ON tasks
  FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('admin', 'manager')
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- Drop old permissive content select policy
DROP POLICY IF EXISTS "content_items_select" ON content_items;

-- Members only see content assigned to them; managers/admins see all
CREATE POLICY "content_items_select" ON content_items
  FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('admin', 'manager')
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );
