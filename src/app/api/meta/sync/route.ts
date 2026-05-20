import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchPageInsights, fetchInstagramInsights } from '@/lib/meta'

export async function POST(request: NextRequest) {
  const { connectionId, month, year } = await request.json()

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: conn, error } = await db
    .from('social_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (error || !conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })

  // For BM pages, stored access_token may be empty — fall back to workspace user token
  const token = conn.access_token || process.env.META_USER_ACCESS_TOKEN || ''

  let metrics: Record<string, unknown> | null = null

  if (conn.platform === 'facebook_page') {
    // Try page token first, fall back to user token
    metrics = await fetchPageInsights(conn.account_id, token, month, year)
    if (!metrics && conn.access_token && process.env.META_USER_ACCESS_TOKEN) {
      metrics = await fetchPageInsights(conn.account_id, process.env.META_USER_ACCESS_TOKEN, month, year)
    }
  } else if (conn.platform === 'instagram') {
    metrics = await fetchInstagramInsights(conn.account_id, token, month, year)
    if (!metrics && conn.access_token && process.env.META_USER_ACCESS_TOKEN) {
      metrics = await fetchInstagramInsights(conn.account_id, process.env.META_USER_ACCESS_TOKEN, month, year)
    }
  } else if (conn.platform === 'google_ads') {
    metrics = { ad_spend: 0, ad_clicks: 0, ad_impressions: 0, ad_conversions: 0 }
  }

  if (!metrics) return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })

  await db.from('social_insights').upsert({
    connection_id: connectionId,
    client_id: conn.client_id,
    platform: conn.platform,
    month,
    year,
    ...metrics,
    synced_at: new Date().toISOString(),
  }, { onConflict: 'connection_id,month,year' })

  await db.from('social_connections').update({ last_synced_at: new Date().toISOString() }).eq('id', connectionId)

  return NextResponse.json({ ok: true, metrics })
}
