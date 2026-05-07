import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { socialAccountId } = await request.json()
  const supabase = await createClient()
  await (supabase as any).from('client_social_accounts').delete().eq('id', socialAccountId)
  return NextResponse.json({ ok: true })
}
