import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function sendTelegramMessage(chatId: string, text: string) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch {
    // Best-effort — don't break the main flow if Telegram is unreachable
  }
}

/**
 * POST /api/telegram-notify
 * Body: { userIds: string[], message: string }
 *
 * Looks up each user's telegram_chat_id and sends them the message.
 * Fire-and-forget: always returns 200 so the caller is never blocked.
 */
export async function POST(request: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 200 })
  }

  const { userIds, message } = await request.json() as { userIds: string[]; message: string }

  if (!userIds?.length || !message) {
    return NextResponse.json({ ok: false, error: 'Missing userIds or message' }, { status: 200 })
  }

  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, telegram_chat_id')
    .in('id', userIds)

  const sends = (profiles ?? [])
    .filter((p: any) => p.telegram_chat_id)
    .map((p: any) => sendTelegramMessage(p.telegram_chat_id, message))

  await Promise.allSettled(sends)

  return NextResponse.json({ ok: true, sent: sends.length })
}
