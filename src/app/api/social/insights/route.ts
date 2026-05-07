import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GRAPH = 'https://graph.facebook.com/v19.0'

async function fetchInstagramInsights(accountId: string, token: string) {
  const [profileRes, insightsRes, mediaRes] = await Promise.all([
    fetch(`${GRAPH}/${accountId}?fields=followers_count,media_count,biography&access_token=${token}`),
    fetch(`${GRAPH}/${accountId}/insights?metric=reach,impressions,profile_views&period=day&since=${Math.floor(Date.now()/1000) - 30*86400}&until=${Math.floor(Date.now()/1000)}&access_token=${token}`),
    fetch(`${GRAPH}/${accountId}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,insights.metric(reach,impressions,engagement)&limit=12&access_token=${token}`),
  ])
  const profile  = await profileRes.json()
  const insights = await insightsRes.json()
  const media    = await mediaRes.json()

  return {
    followers:    profile.followers_count   ?? 0,
    media_count:  profile.media_count       ?? 0,
    reach_30d:    insights.data?.find((d: any) => d.name === 'reach')?.values?.reduce((s: number, v: any) => s + (v.value ?? 0), 0) ?? 0,
    impressions_30d: insights.data?.find((d: any) => d.name === 'impressions')?.values?.reduce((s: number, v: any) => s + (v.value ?? 0), 0) ?? 0,
    recent_posts: (media.data ?? []).map((p: any) => ({
      id:        p.id,
      caption:   p.caption?.slice(0, 100),
      type:      p.media_type,
      date:      p.timestamp,
      likes:     p.like_count     ?? 0,
      comments:  p.comments_count ?? 0,
      reach:     p.insights?.data?.find((d: any) => d.name === 'reach')?.values?.[0]?.value ?? 0,
    })),
  }
}

async function fetchFacebookInsights(pageId: string, token: string) {
  const [pageRes, insightsRes] = await Promise.all([
    fetch(`${GRAPH}/${pageId}?fields=fan_count,name&access_token=${token}`),
    fetch(`${GRAPH}/${pageId}/insights?metric=page_impressions,page_reach,page_post_engagements&period=month&access_token=${token}`),
  ])
  const page     = await pageRes.json()
  const insights = await insightsRes.json()
  const metric   = (name: string) => insights.data?.find((d: any) => d.name === name)?.values?.slice(-1)[0]?.value ?? 0

  return {
    followers:       page.fan_count          ?? 0,
    impressions_30d: metric('page_impressions'),
    reach_30d:       metric('page_reach'),
    engagement_30d:  metric('page_post_engagements'),
  }
}

/**
 * POST /api/social/insights
 * Body: { socialAccountId: string }
 * Fetches fresh insights and caches them in social_insights table.
 */
export async function POST(request: Request) {
  const { socialAccountId } = await request.json()
  const supabase = await createClient()

  const { data: account } = await (supabase as any)
    .from('client_social_accounts')
    .select('*')
    .eq('id', socialAccountId)
    .single()

  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  let metrics: Record<string, any> = {}

  try {
    if (account.platform === 'instagram') {
      metrics = await fetchInstagramInsights(account.account_id, account.access_token)
    } else if (account.platform === 'facebook') {
      metrics = await fetchFacebookInsights(account.account_id, account.access_token)
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  await (supabase as any).from('social_insights').insert({
    social_account_id: socialAccountId,
    period: 'month',
    metrics,
  })

  return NextResponse.json({ ok: true, metrics })
}
