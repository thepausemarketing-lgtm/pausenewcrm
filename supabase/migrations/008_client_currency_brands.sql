-- Currency per client (INR, USD, AED, GBP, EUR…)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR';

-- Sub-brands: a client can belong to a parent client group
-- e.g. "Dr. Daud" is parent; "Defily", "Fund8", "Dr. Daud Personal" are brands under him
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS parent_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
