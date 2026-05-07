import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APP_ID     = process.env.META_APP_ID!
const APP_SECRET = process.env.META_APP_SECRET!
const BASE_URL   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pausenewcrm-pi.vercel.app'
const REDIRECT   = `${BASE_URL}/api/auth/meta/callback`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code     = searchParams.get('code')
  const state    = searchParams.get('state') // clientId|userId
  const errorMsg = searchParams.get('error_description')

  if (errorMsg || !code || !state) {
    return NextResponse.redirect(`${BASE_URL}/app/clients?social_error=${encodeURIComponent(errorMsg ?? 'cancelled')}`)
  }

  const [clientId, userId] = state.split('|')

  // Exchange code for short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT)}&client_secret=${APP_SECRET}&code=${code}`
  )
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${BASE_URL}/app/clients/${clientId}/social?error=token_exchange_failed`)
  }

  // Exchange for long-lived token (60 days)
  const llRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
  )
  const llData = await llRes.json()
  const longToken = llData.access_token ?? tokenData.access_token

  // Fetch user's Facebook pages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,picture,access_token,instagram_business_account&access_token=${longToken}`
  )
  const pagesData = await pagesRes.json()
  const pages = pagesData.data ?? []

  const supabase = await createClient()

  for (const page of pages) {
    // Save Facebook Page
    await (supabase as any).from('client_social_accounts').upsert({
      client_id:      clientId,
      platform:       'facebook',
      account_id:     page.id,
      account_name:   page.name,
      account_picture: page.picture?.data?.url ?? null,
      access_token:   page.access_token, // page token — never expires
      token_expires_at: null,
      connected_by:   userId,
    }, { onConflict: 'client_id,platform,account_id' })

    // If page has linked Instagram Business Account
    if (page.instagram_business_account?.id) {
      const igId = page.instagram_business_account.id
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${igId}?fields=id,name,username,profile_picture_url&access_token=${page.access_token}`
      )
      const igData = await igRes.json()
      await (supabase as any).from('client_social_accounts').upsert({
        client_id:      clientId,
        platform:       'instagram',
        account_id:     igId,
        account_name:   igData.username ? `@${igData.username}` : igData.name,
        account_picture: igData.profile_picture_url ?? null,
        access_token:   page.access_token,
        token_expires_at: null,
        connected_by:   userId,
      }, { onConflict: 'client_id,platform,account_id' })
    }
  }

  // Find the client slug to redirect back
  const { data: client } = await supabase.from('clients').select('slug').eq('id', clientId).single()
  return NextResponse.redirect(`${BASE_URL}/app/clients/${client?.slug ?? clientId}/social?connected=1`)
}
