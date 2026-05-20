-- Social connections per client (one row per platform account)
create table social_connections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  platform text not null check (platform in ('facebook_page', 'instagram', 'google_ads', 'linkedin', 'tiktok')),
  account_id text not null,          -- page ID / IG account ID / ad account ID
  account_name text,
  account_picture text,
  access_token text not null,        -- long-lived page/user token
  token_expires_at timestamptz,      -- null = never expires (system user)
  last_synced_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(client_id, platform, account_id)
);

-- Monthly insights snapshots
create table social_insights (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references social_connections(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  platform text not null,
  month int not null check (month between 1 and 12),
  year int not null,
  -- Common metrics
  followers int,
  followers_gained int,
  reach int,
  impressions int,
  engagement int,
  posts_count int,
  -- Ads metrics
  ad_spend numeric(12,2),
  ad_clicks int,
  ad_impressions int,
  ad_conversions int,
  -- Raw JSON for any extra fields
  raw jsonb,
  synced_at timestamptz default now(),
  unique(connection_id, month, year)
);

-- RLS
alter table social_connections enable row level security;
alter table social_insights enable row level security;

create policy "auth users read social_connections" on social_connections for select to authenticated using (true);
create policy "auth users manage social_connections" on social_connections for all to authenticated using (true);
create policy "auth users read social_insights" on social_insights for select to authenticated using (true);
create policy "auth users manage social_insights" on social_insights for all to authenticated using (true);
