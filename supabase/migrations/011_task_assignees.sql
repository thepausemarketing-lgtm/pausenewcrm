CREATE TABLE IF NOT EXISTS task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_assignees_select" ON task_assignees FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_assignees_insert" ON task_assignees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "task_assignees_delete" ON task_assignees FOR DELETE TO authenticated USING (true);

-- Seed from existing assigned_to so no data is lost
INSERT INTO task_assignees (task_id, user_id)
SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL
ON CONFLICT DO NOTHING;

-- Update tasks RLS to also allow access if user is in task_assignees
DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks
  FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('admin', 'manager')
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM task_assignees ta WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
    )
  );
