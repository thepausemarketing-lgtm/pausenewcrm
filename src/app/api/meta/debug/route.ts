import { NextRequest, NextResponse } from 'next/server'
import { metaGet } from '@/lib/meta'

export async function POST(request: NextRequest) {
  const { pageId } = await request.json()
  const token = process.env.META_USER_ACCESS_TOKEN!

  const results: Record<string, unknown> = {}

  // Test 1: basic page info
  try {
    results.page = await metaGet(`/${pageId}`, token, { fields: 'id,name,fan_count,followers_count' })
  } catch (e: unknown) {
    results.page_error = e instanceof Error ? e.message : String(e)
  }

  // Test 2: insights
  try {
    const now = new Date()
    const since = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000)
    const until = Math.floor(new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() / 1000)
    results.insights = await metaGet(`/${pageId}/insights`, token, {
      metric: 'page_impressions,page_reach,page_engaged_users',
      period: 'month',
      since: String(since),
      until: String(until),
    })
  } catch (e: unknown) {
    results.insights_error = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json(results)
}
