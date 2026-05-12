import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ clients: [], tasks: [], content: [], campaigns: [] })

  const supabase = await createClient()
  const like = `%${q}%`
  const startsWith = `${q}%`

  const [clientsRes, tasksRes, contentRes, campaignsRes] = await Promise.all([
    supabase.from('clients').select('id, name, slug, status, industry').ilike('name', like).limit(6),
    supabase.from('tasks')
      .select('id, title, status, priority, due_date, client:clients(name,slug)')
      .ilike('title', like)
      .not('status', 'in', '(done,cancelled)')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(6),
    supabase.from('content_items')
      .select('id, title, status, publish_at, client:clients(name,slug)')
      .ilike('title', like)
      .not('status', 'eq', 'cancelled')
      .order('publish_at', { ascending: true, nullsFirst: false })
      .limit(6),
    supabase.from('campaigns')
      .select('id, name, status, client:clients(name,slug)')
      .ilike('name', like)
      .limit(4),
  ])

  // Sort: exact-start matches first, then contains
  const rank = (title: string) => title.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1

  const clients = (clientsRes.data ?? []).sort((a: any, b: any) => rank(a.name) - rank(b.name))
  const tasks = (tasksRes.data ?? []).sort((a: any, b: any) => rank(a.title) - rank(b.title))
  const content = (contentRes.data ?? []).sort((a: any, b: any) => rank(a.title) - rank(b.title))
  const campaigns = (campaignsRes.data ?? []).sort((a: any, b: any) => rank(a.name) - rank(b.name))

  return NextResponse.json({ clients, tasks, content, campaigns })
}
