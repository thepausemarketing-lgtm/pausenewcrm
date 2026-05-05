-- ============================================================
-- Pause Marketing CRM — Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member');
CREATE TYPE client_status AS ENUM ('prospect', 'active', 'paused', 'churned');
CREATE TYPE billing_type AS ENUM ('retainer', 'project', 'hourly');
CREATE TYPE campaign_type AS ENUM ('launch', 'seasonal', 'always_on', 'event', 'other');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE content_type AS ENUM ('post', 'story', 'reel', 'ad', 'blog_post', 'email', 'video', 'other');
CREATE TYPE platform_type AS ENUM ('instagram', 'linkedin', 'tiktok', 'facebook', 'twitter', 'youtube', 'email', 'blog', 'google_ads', 'other');
CREATE TYPE content_status AS ENUM ('draft', 'in_review', 'approved', 'scheduled', 'published', 'cancelled');
CREATE TYPE task_category AS ENUM ('strategy', 'design', 'copywriting', 'video_editing', 'reporting', 'admin', 'other');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'cancelled');
CREATE TYPE notification_type AS ENUM ('task_assigned', 'task_due_soon', 'content_review', 'comment_mention', 'campaign_update');
CREATE TYPE entity_type AS ENUM ('task', 'content_item', 'client', 'campaign');

-- ============================================================
-- HELPER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  role        user_role NOT NULL DEFAULT 'member',
  timezone    TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Role helper function used in RLS
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  logo_url        TEXT,
  website         TEXT,
  industry        TEXT,
  status          client_status NOT NULL DEFAULT 'prospect',
  billing_type    billing_type NOT NULL DEFAULT 'retainer',
  monthly_value   NUMERIC(12,2),
  health_score    INTEGER CHECK (health_score BETWEEN 1 AND 5),
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_slug ON clients(slug);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  title         TEXT,
  email         TEXT,
  phone         TEXT,
  linkedin_url  TEXT,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_client_id ON contacts(client_id);

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          campaign_type NOT NULL DEFAULT 'other',
  status        campaign_status NOT NULL DEFAULT 'draft',
  start_date    DATE,
  end_date      DATE,
  budget        NUMERIC(12,2),
  description   TEXT,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- CONTENT ITEMS
-- ============================================================
CREATE TABLE content_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  content_type    content_type NOT NULL,
  platform        platform_type NOT NULL,
  status          content_status NOT NULL DEFAULT 'draft',
  caption         TEXT,
  brief_url       TEXT,
  publish_at      TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_items_client_id ON content_items(client_id);
CREATE INDEX idx_content_items_campaign_id ON content_items(campaign_id);
CREATE INDEX idx_content_items_publish_at ON content_items(publish_at);
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_content_items_assigned_to ON content_items(assigned_to);

CREATE TRIGGER content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  campaign_id       UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  content_item_id   UUID REFERENCES content_items(id) ON DELETE SET NULL,
  parent_task_id    UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  category          task_category NOT NULL DEFAULT 'other',
  priority          task_priority NOT NULL DEFAULT 'medium',
  status            task_status NOT NULL DEFAULT 'todo',
  due_date          DATE,
  estimated_hours   NUMERIC(6,2),
  actual_hours      NUMERIC(6,2),
  assigned_to       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  position          INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TASK COMMENTS
-- ============================================================
CREATE TABLE task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);

CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ATTACHMENTS
-- ============================================================
CREATE TABLE attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path  TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     INTEGER,
  mime_type     TEXT,
  entity_type   entity_type NOT NULL,
  entity_id     UUID NOT NULL,
  uploaded_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          notification_type NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  entity_type   TEXT,
  entity_id     UUID,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
CREATE TABLE activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
