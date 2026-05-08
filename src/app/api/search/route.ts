import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ clients: [], tasks: [], content: [] })

  const supabase = await createClient()
  const like = `%${q}%`

  const [clientsRes, tasksRes, contentRes] = await Promise.all([
    supabase.from('clients').select('id, name, slug, status').ilike('name', like).limit(5),
    supabase.from('tasks').select('id, title, status, client:clients(name,slug)').ilike('title', like).not('status', 'in', '(done,cancelled)').limit(5),
    supabase.from('content_items').select('id, title, status, client:clients(name,slug)').ilike('title', like).not('status', 'eq', 'cancelled').limit(5),
  ])

  return NextResponse.json({
    clients: clientsRes.data ?? [],
    tasks: tasksRes.data ?? [],
    content: contentRes.data ?? [],
  })
}
