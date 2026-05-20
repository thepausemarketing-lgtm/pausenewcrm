import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function sendTelegramMessage(chatId: string, text: string) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch {
    // best-effort
  }
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const dt = new Date(iso); dt.setHours(0, 0, 0, 0)

  if (dt.getTime() === today.getTime()) return '📅 Due today'
  if (dt.getTime() === tomorrow.getTime()) return '📅 Due tomorrow'
  if (dt < today) return `⚠️ Overdue (${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`
  return `📅 ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

async function runDigest(triggeredBy?: string) {
  const db = getAdminClient()

  // 1. Get all active profiles with telegram_chat_id
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, telegram_chat_id')
    .eq('is_active', true)
    .not('telegram_chat_id', 'is', null)

  if (!profiles?.length) return { sent: 0 }

  const profileIds = profiles.map(p => p.id)

  // 2. Fetch all pending tasks for these users (via task_assignees junction + fallback assigned_to)
  const { data: taskAssignees } = await db
    .from('task_assignees')
    .select('user_id, task:tasks(id, title, due_date, status, client:clients(name))')
    .in('user_id', profileIds)

  // Also fetch tasks via assigned_to for tasks not using junction table
  const { data: directTasks } = await db
    .from('tasks')
    .select('id, title, due_date, status, assigned_to, client:clients(name)')
    .in('assigned_to', profileIds)
    .not('status', 'eq', 'done')

  // 3. Fetch all pending content items
  const { data: contentItems } = await db
    .from('content_items')
    .select('id, title, platform, status, publish_at, assigned_to, client:clients(name)')
    .in('assigned_to', profileIds)
    .not('status', 'eq', 'published')

  // Build per-user maps
  const tasksByUser: Record<string, { title: string; due_date: string | null; status: string; clientName: string | null }[]> = {}
  const contentByUser: Record<string, { title: string; platform: string; status: string; publish_at: string | null; clientName: string | null }[]> = {}

  // From junction table
  ;(taskAssignees ?? []).forEach((ta: any) => {
    const t = ta.task
    if (!t || t.status === 'done') return
    if (!tasksByUser[ta.user_id]) tasksByUser[ta.user_id] = []
    tasksByUser[ta.user_id].push({
      title: t.title,
      due_date: t.due_date,
      status: t.status,
      clientName: t.client?.name ?? null,
    })
  })

  // From direct assigned_to (deduplicate)
  const seenTaskIds = new Set<string>()
  ;(taskAssignees ?? []).forEach((ta: any) => ta.task?.id && seenTaskIds.add(ta.task.id))
  ;(directTasks ?? []).forEach((t: any) => {
    if (seenTaskIds.has(t.id)) return
    if (!tasksByUser[t.assigned_to]) tasksByUser[t.assigned_to] = []
    tasksByUser[t.assigned_to].push({
      title: t.title,
      due_date: t.due_date,
      status: t.status,
      clientName: t.client?.name ?? null,
    })
  })

  // Content
  ;(contentItems ?? []).forEach((c: any) => {
    if (!contentByUser[c.assigned_to]) contentByUser[c.assigned_to] = []
    contentByUser[c.assigned_to].push({
      title: c.title,
      platform: c.platform,
      status: c.status,
      publish_at: c.publish_at,
      clientName: c.client?.name ?? null,
    })
  })

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  let sent = 0
  const sentProfiles: { id: string; name: string }[] = []

  for (const profile of profiles) {
    const tasks = tasksByUser[profile.id] ?? []
    const content = contentByUser[profile.id] ?? []

    if (tasks.length === 0 && content.length === 0) continue

    const firstName = profile.full_name.split(' ')[0]
    let msg = `🌅 <b>Good evening, ${firstName}!</b>\nHere's your summary for ${today}.\n`

    if (tasks.length > 0) {
      // Sort: overdue first, then by due date, then no date
      const sorted = [...tasks].sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      })

      msg += `\n📋 <b>Pending Tasks (${tasks.length})</b>\n`
      sorted.slice(0, 10).forEach(t => {
        const client = t.clientName ? ` <i>[${t.clientName}]</i>` : ''
        const due = t.due_date ? ` — ${formatDate(t.due_date)}` : ''
        msg += `• ${t.title}${client}${due}\n`
      })
      if (tasks.length > 10) msg += `<i>...and ${tasks.length - 10} more</i>\n`
    }

    if (content.length > 0) {
      const statusLabel: Record<string, string> = {
        draft: 'Draft', in_review: 'In Review', approved: 'Approved', scheduled: 'Scheduled',
      }
      const sorted = [...content].sort((a, b) => {
        if (!a.publish_at && !b.publish_at) return 0
        if (!a.publish_at) return 1
        if (!b.publish_at) return -1
        return new Date(a.publish_at).getTime() - new Date(b.publish_at).getTime()
      })

      msg += `\n📸 <b>Pending Content (${content.length})</b>\n`
      sorted.slice(0, 10).forEach(c => {
        const client = c.clientName ? ` <i>[${c.clientName}]</i>` : ''
        const due = c.publish_at ? ` — ${formatDate(c.publish_at)}` : ''
        const status = statusLabel[c.status] ?? c.status
        msg += `• ${c.title}${client} — ${status}${due}\n`
      })
      if (content.length > 10) msg += `<i>...and ${content.length - 10} more</i>\n`
    }

    msg += `\nHave a productive evening! 💪\n<i>— Pause CRM</i>`

    await sendTelegramMessage(profile.telegram_chat_id!, msg)
    sentProfiles.push({ id: profile.id, name: profile.full_name })
    sent++
  }

  // Log the digest send
  if (sentProfiles.length > 0) {
    try {
      await db.from('notification_logs').insert({
        type: 'daily_digest',
        recipient_ids: sentProfiles.map(p => p.id),
        recipient_names: sentProfiles.map(p => p.name),
        message_preview: `Daily digest — pending tasks & content summary`,
        triggered_by: triggeredBy ?? null,
      })
    } catch {
      // non-blocking
    }
  }

  return { sent }
}

// ── GET: Vercel cron trigger ──────────────────────────────────────────────────
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const result = await runDigest(undefined) // cron — no triggered_by
  return NextResponse.json({ ok: true, ...result })
}

// ── POST: Manual trigger from UI (admin only) ─────────────────────────────────
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

  const result = await runDigest(user.id)
  return NextResponse.json({ ok: true, ...result })
}
