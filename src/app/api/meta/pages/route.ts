import { NextRequest, NextResponse } from 'next/server'
import { getPageAccessTokens, exchangeForLongLivedToken } from '@/lib/meta'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    // Use stored workspace token if no token provided
    const token = body.token || process.env.META_USER_ACCESS_TOKEN
    if (!token) return NextResponse.json({ error: 'No access token configured. Add META_USER_ACCESS_TOKEN to Vercel env vars.' }, { status: 400 })
    const { token: longToken } = await exchangeForLongLivedToken(token)
    const pages = await getPageAccessTokens(longToken)
    return NextResponse.json({ pages })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
