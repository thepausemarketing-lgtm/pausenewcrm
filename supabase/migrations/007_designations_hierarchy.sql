-- Designations table (Designer, Account Manager, Video Editor, etc.)
CREATE TABLE IF NOT EXISTS designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE designations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "designations_select" ON designations FOR SELECT TO authenticated USING (true);
CREATE POLICY "designations_insert" ON designations FOR INSERT TO authenticated WITH CHECK (current_user_role() = 'admin');
CREATE POLICY "designations_update" ON designations FOR UPDATE TO authenticated USING (current_user_role() = 'admin');
CREATE POLICY "designations_delete" ON designations FOR DELETE TO authenticated USING (current_user_role() = 'admin');

-- Add designation + reporting hierarchy to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS designation_id UUID REFERENCES designations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
