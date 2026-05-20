import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    const json = await res.json()
    return json.ok === true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 200 })
  }

  const { userIds, message, type, triggeredBy } = await request.json() as {
    userIds: string[]
    message: string
    type?: string
    triggeredBy?: string
  }

  if (!userIds?.length || !message) {
    return NextResponse.json({ ok: false, error: 'Missing userIds or message' }, { status: 200 })
  }

  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, telegram_chat_id')
    .in('id', userIds)

  let sent = 0
  const logs: object[] = []

  for (const p of (profiles ?? []) as any[]) {
    let status = 'failed'
    if (p.telegram_chat_id) {
      const ok = await sendTelegramMessage(p.telegram_chat_id, message)
      status = ok ? 'delivered' : 'failed'
      if (ok) sent++
    }
    logs.push({
      type: type ?? 'notification',
      recipient_id: p.id,
      recipient_name: p.full_name,
      full_message: message,
      status,
      triggered_by: triggeredBy ?? null,
    })
  }

  // Log all sends (best-effort)
  try {
    const db = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await db.from('notification_logs').insert(logs)
  } catch {
    // non-blocking
  }

  return NextResponse.json({ ok: true, sent })
}
