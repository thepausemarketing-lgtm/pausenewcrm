import { createClient } from '@/lib/supabase/server'
import CalendarView from '@/components/calendar/CalendarView'
import PageHeader from '@/components/shared/PageHeader'
import type { Platform, ContentStatus } from '@/types/database.types'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; client?: string; platform?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const now = new Date()
  const year = parseInt(params.year ?? now.getFullYear().toString())
  const month = parseInt(params.month ?? (now.getMonth() + 1).toString())

  const startOfMonth = new Date(year, month - 1, 1).toISOString()
  const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString()

  let query = supabase
    .from('content_items')
    .select('*, client:clients(name,slug,id), assignee:profiles!content_items_assigned_to_fkey(full_name)')
    .gte('publish_at', startOfMonth)
    .lte('publish_at', endOfMonth)
    .order('publish_at', { ascending: true })

  if (params.client) query = query.eq('client_id', params.client)
  if (params.platform) query = query.eq('platform', params.platform as Platform)
  if (params.status) query = query.eq('status', params.status as ContentStatus)

  const [{ data: rawItems }, { data: rawClients }] = await Promise.all([
    query,
    supabase.from('clients').select('id,name').eq('status', 'active').order('name'),
  ])

  const { data: { user } } = await supabase.auth.getUser()
  const { data: rawProfile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const profile = rawProfile as { role: string } | null

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
      <CalendarView
        items={(rawItems ?? []) as Parameters<typeof CalendarView>[0]['items']}
        clients={(rawClients ?? []) as { id: string; name: string }[]}
        year={year}
        month={month}
        canApprove={profile?.role === 'admin' || profile?.role === 'manager'}
        filters={{ client: params.client, platform: params.platform, status: params.status }}
      />
      </div>
    </div>
  )
}
