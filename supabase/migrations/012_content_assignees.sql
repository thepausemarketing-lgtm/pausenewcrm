-- content_assignees: junction table for multiple assignees per content item
-- (mirrors task_assignees pattern)

CREATE TABLE IF NOT EXISTS content_assignees (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at   timestamptz DEFAULT now(),
  UNIQUE(content_item_id, user_id)
);

ALTER TABLE content_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users view content assignees"
  ON content_assignees FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth users insert content assignees"
  ON content_assignees FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth users delete content assignees"
  ON content_assignees FOR DELETE TO authenticated USING (true);
