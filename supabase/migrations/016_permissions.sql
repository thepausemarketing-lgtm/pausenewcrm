-- Add granular permission flags to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS can_view_credentials boolean NOT NULL DEFAULT false;

-- Admins always have this permission (informational — enforced in app layer)
UPDATE profiles SET can_view_credentials = true WHERE role = 'admin';
