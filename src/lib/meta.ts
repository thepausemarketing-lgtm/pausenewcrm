const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

export async function metaGet(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH_BASE}${path}`)
  url.searchParams.set('access_token', token)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json
}

// Exchange short-lived user token for long-lived (60 days)
export async function exchangeForLongLivedToken(shortToken: string): Promise<{ token: string; expires: Date }> {
  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const data = await metaGet('/oauth/access_token', shortToken, {
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  })
  const expires = new Date(Date.now() + (data.expires_in ?? 5184000) * 1000)
  return { token: data.access_token, expires }
}

// Get page access tokens for all pages the user manages
export async function getPageAccessTokens(userToken: string) {
  const data = await metaGet('/me/accounts', userToken, { fields: 'id,name,picture,access_token,instagram_business_account' })
  return data.data as Array<{
    id: string
    name: string
    picture: { data: { url: string } }
    access_token: string
    instagram_business_account?: { id: string }
  }>
}

// Fetch Facebook Page insights for a month
export async function fetchPageInsights(pageId: string, token: string, month: number, year: number) {
  const since = new Date(year, month - 1, 1)
  const until = new Date(year, month, 1)
  const sinceTs = Math.floor(since.getTime() / 1000)
  const untilTs = Math.floor(until.getTime() / 1000)

  const metrics = 'page_impressions,page_reach,page_engaged_users,page_post_engagements,page_fan_adds_unique'

  try {
    const data = await metaGet(`/${pageId}/insights`, token, {
      metric: metrics,
      period: 'month',
      since: String(sinceTs),
      until: String(untilTs),
    })

    const result: Record<string, number> = {}
    for (const item of (data.data ?? [])) {
      const val = item.values?.[0]?.value ?? 0
      result[item.name] = typeof val === 'number' ? val : 0
    }

    // Get follower count separately
    try {
      const pageData = await metaGet(`/${pageId}`, token, { fields: 'fan_count,followers_count' })
      result.followers = pageData.followers_count ?? pageData.fan_count ?? 0
    } catch {
      // ignore follower fetch errors
    }

    return {
      impressions: result.page_impressions ?? 0,
      reach: result.page_reach ?? 0,
      engagement: result.page_post_engagements ?? 0,
      followers_gained: result.page_fan_adds_unique ?? 0,
      followers: result.followers ?? 0,
    }
  } catch (e) {
    console.error('Page insights error:', e)
    return null
  }
}

// Fetch Instagram Business Account insights for a month
export async function fetchInstagramInsights(igAccountId: string, token: string, month: number, year: number) {
  const since = new Date(year, month - 1, 1)
  const until = new Date(year, month, 1)
  const sinceTs = Math.floor(since.getTime() / 1000)
  const untilTs = Math.floor(until.getTime() / 1000)

  try {
    const [insightsData, accountData, mediaData] = await Promise.allSettled([
      metaGet(`/${igAccountId}/insights`, token, {
        metric: 'impressions,reach,profile_views',
        period: 'month',
        since: String(sinceTs),
        until: String(untilTs),
      }),
      metaGet(`/${igAccountId}`, token, { fields: 'followers_count,media_count' }),
      metaGet(`/${igAccountId}/media`, token, {
        fields: 'timestamp',
        since: String(sinceTs),
        until: String(untilTs),
      }),
    ])

    const igMetrics: Record<string, number> = {}
    if (insightsData.status === 'fulfilled') {
      for (const item of (insightsData.value.data ?? [])) {
        const val = item.values?.[0]?.value ?? 0
        igMetrics[item.name] = typeof val === 'number' ? val : 0
      }
    }

    const followers = accountData.status === 'fulfilled' ? (accountData.value.followers_count ?? 0) : 0
    const postsCount = mediaData.status === 'fulfilled' ? (mediaData.value.data?.length ?? 0) : 0

    return {
      impressions: igMetrics.impressions ?? 0,
      reach: igMetrics.reach ?? 0,
      followers,
      posts_count: postsCount,
      engagement: igMetrics.profile_views ?? 0,
    }
  } catch (e) {
    console.error('IG insights error:', e)
    return null
  }
}

// Fetch Ad Account insights for a month
export async function fetchAdInsights(adAccountId: string, token: string, month: number, year: number) {
  const since = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const until = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  try {
    const data = await metaGet(`/act_${adAccountId}/insights`, token, {
      fields: 'spend,clicks,impressions,actions',
      time_range: JSON.stringify({ since, until }),
      level: 'account',
    })

    const row = data.data?.[0]
    if (!row) return { ad_spend: 0, ad_clicks: 0, ad_impressions: 0, ad_conversions: 0 }

    const conversions = (row.actions ?? []).filter((a: { action_type: string; value?: string }) =>
      ['purchase', 'lead', 'complete_registration'].includes(a.action_type)
    ).reduce((sum: number, a: { value?: string }) => sum + parseInt(a.value ?? '0'), 0)

    return {
      ad_spend: parseFloat(row.spend ?? '0'),
      ad_clicks: parseInt(row.clicks ?? '0'),
      ad_impressions: parseInt(row.impressions ?? '0'),
      ad_conversions: conversions,
    }
  } catch (e) {
    console.error('Ads insights error:', e)
    return null
  }
}
