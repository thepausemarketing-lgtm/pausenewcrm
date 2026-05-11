-- Fix tasks_update RLS to also allow members assigned via task_assignees junction table
DROP POLICY IF EXISTS "tasks_update" ON tasks;

CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE TO authenticated
  USING (
    current_user_role() IN ('admin', 'manager')
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM task_assignees
      WHERE task_assignees.task_id = tasks.id
        AND task_assignees.user_id = auth.uid()
    )
  );
