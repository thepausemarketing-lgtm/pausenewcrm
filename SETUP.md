# Pause Marketing CRM — Setup Guide

## Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A Supabase account (supabase.com)

---

## Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**, fill in a name (e.g. "pause-crm"), set a strong DB password, choose a region
3. Wait for the project to provision (~1 min)
4. Go to **Project Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public** key
   - **service_role** key (keep this secret — only used server-side for invites)

---

## Step 2 — Configure Environment

Edit `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

---

## Step 3 — Run Database Migrations

In your Supabase dashboard, go to **SQL Editor** and run each migration file in order:

1. Open `supabase/migrations/001_initial_schema.sql` → paste & run
2. Open `supabase/migrations/002_rls_policies.sql` → paste & run
3. Open `supabase/migrations/003_storage_buckets.sql` → paste & run

This creates all tables, RLS policies, triggers, and storage buckets.

---

## Step 4 — Create First Admin User

1. In Supabase dashboard, go to **Authentication → Users → Add User**
2. Enter your email and a password, click **Create User**
3. Go to **SQL Editor** and run:

```sql
UPDATE profiles SET role = 'admin', full_name = 'Your Name' WHERE id = '<user-id-from-auth>';
```

Replace `<user-id-from-auth>` with the UUID shown in the Users list.

---

## Step 5 — Start Development Server

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

---

## Step 6 — Invite Team Members

Once logged in as Admin:
1. Go to **Settings → Team**
2. Enter a teammate's email and select their role
3. Click **Send Invite** — they'll receive an email to set their password

---

## Deploying to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Set the same three environment variables in your Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

In Supabase dashboard, go to **Authentication → URL Configuration** and add your Vercel URL to:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/auth/callback`
