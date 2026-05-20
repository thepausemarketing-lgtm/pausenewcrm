import { NextRequest, NextResponse } from 'next/server'
import { getPageAccessTokens, exchangeForLongLivedToken } from '@/lib/meta'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    const { token: longToken } = await exchangeForLongLivedToken(token)
    const pages = await getPageAccessTokens(longToken)
    return NextResponse.json({ pages })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
