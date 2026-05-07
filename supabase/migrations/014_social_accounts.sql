-- Social media account connections per client
CREATE TABLE IF NOT EXISTS client_social_accounts (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform          text NOT NULL,           -- 'instagram' | 'facebook' | 'google_ads'
  account_id        text NOT NULL,           -- platform's page/account/user ID
  account_name      text,                    -- display name e.g. "@pausemarketing"
  account_picture   text,                    -- profile picture URL
  access_token      text NOT NULL,           -- long-lived token (encrypted at rest via Supabase)
  token_expires_at  timestamptz,             -- null = never expires (page tokens)
  connected_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  connected_at      timestamptz DEFAULT now(),
  UNIQUE(client_id, platform, account_id)
);

ALTER TABLE client_social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users view social accounts"
  ON client_social_accounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth users manage social accounts"
  ON client_social_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Cache table for fetched insights (so we don't hit API on every page load)
CREATE TABLE IF NOT EXISTS social_insights (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  social_account_id uuid NOT NULL REFERENCES client_social_accounts(id) ON DELETE CASCADE,
  fetched_at      timestamptz DEFAULT now(),
  period          text NOT NULL,             -- 'day' | 'week' | 'month'
  metrics         jsonb NOT NULL DEFAULT '{}'  -- { followers, reach, impressions, engagement, ... }
);

ALTER TABLE social_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users view insights"
  ON social_insights FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth users insert insights"
  ON social_insights FOR INSERT TO authenticated WITH CHECK (true);
