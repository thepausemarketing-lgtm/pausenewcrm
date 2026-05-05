CREATE TABLE IF NOT EXISTS client_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,       -- 'instagram', 'facebook', 'linkedin', 'website', 'custom', etc.
  label TEXT,                   -- e.g. "Client Instagram", "Ad Account"
  url TEXT,
  username TEXT,
  password TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_credentials ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read credentials
CREATE POLICY "credentials_select" ON client_credentials
  FOR SELECT TO authenticated USING (true);

-- Managers and admins can insert
CREATE POLICY "credentials_insert" ON client_credentials
  FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'manager'));

-- Managers and admins can update
CREATE POLICY "credentials_update" ON client_credentials
  FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin', 'manager'));

-- Only admins can delete
CREATE POLICY "credentials_delete" ON client_credentials
  FOR DELETE TO authenticated
  USING (current_user_role() = 'admin');
