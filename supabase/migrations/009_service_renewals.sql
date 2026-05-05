CREATE TABLE IF NOT EXISTS service_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  vendor TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  cost NUMERIC,
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_cycle TEXT NOT NULL DEFAULT 'yearly',
  renewal_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT false,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE service_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "renewals_select" ON service_renewals FOR SELECT TO authenticated USING (true);
CREATE POLICY "renewals_insert" ON service_renewals FOR INSERT TO authenticated WITH CHECK (current_user_role() IN ('admin', 'manager'));
CREATE POLICY "renewals_update" ON service_renewals FOR UPDATE TO authenticated USING (current_user_role() IN ('admin', 'manager'));
CREATE POLICY "renewals_delete" ON service_renewals FOR DELETE TO authenticated USING (current_user_role() IN ('admin', 'manager'));
