import { createClient } from '@/lib/supabase/server'
import { getVisibleUserIds } from '@/lib/supabase/helpers'
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: rawProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = rawProfile as { role: string } | null

  const now = new Date()
  const year = parseInt(params.year ?? now.getFullYear().toString())
  const month = parseInt(params.month ?? (now.getMonth() + 1).toString())

  const startOfMonth = new Date(year, month - 1, 1).toISOString()
  const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString()

  // Hierarchy-based visibility
  const visibleIds = await getVisibleUserIds(supabase, user.id)

  // Get content_item IDs where a visible user is in content_assignees (multi-assignee)
  let coContentIds: string[] = []
  if (visibleIds !== null) {
    const { data: coAssigned } = await (supabase as any)
      .from('content_assignees')
      .select('content_item_id')
      .in('user_id', visibleIds)
    coContentIds = (coAssigned ?? []).map((r: any) => r.content_item_id)
  }

  let query = (supabase as any)
    .from('content_items')
    .select('*, client:clients(name,slug,id), assignee:profiles!content_items_assigned_to_fkey(full_name), content_assignees(user_id, user:profiles!content_assignees_user_id_fkey(id,full_name,avatar_url))')
    .gte('publish_at', startOfMonth)
    .lte('publish_at', endOfMonth)
    .order('publish_at', { ascending: true })

  // Apply hierarchy visibility filter
  if (visibleIds !== null) {
    const orParts: string[] = [
      `assigned_to.in.(${visibleIds.join(',')})`,
      `assigned_to.is.null`, // unassigned items are visible to all
      ...(coContentIds.length > 0 ? [`id.in.(${coContentIds.join(',')})`] : []),
    ]
    query = query.or(orParts.join(','))
  }

  if (params.client) query = query.eq('client_id', params.client)
  if (params.platform) query = query.eq('platform', params.platform as Platform)
  if (params.status) query = query.eq('status', params.status as ContentStatus)

  const [{ data: rawItems }, { data: rawClients }] = await Promise.all([
    query,
    supabase.from('clients').select('id,name,parent_client_id').not('status', 'eq', 'churned').order('name'),
  ])

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <CalendarView
          items={(rawItems ?? []) as Parameters<typeof CalendarView>[0]['items']}
          clients={(rawClients ?? []) as { id: string; name: string; parent_client_id?: string | null }[]}
          year={year}
          month={month}
          canApprove={profile?.role === 'admin' || profile?.role === 'manager'}
          filters={{ client: params.client, platform: params.platform, status: params.status }}
        />
      </div>
    </div>
  )
}
