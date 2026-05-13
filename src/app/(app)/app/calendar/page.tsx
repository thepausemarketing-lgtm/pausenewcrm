import { createClient } from '@/lib/supabase/server'
import { getVisibleUserIds } from '@/lib/supabase/helpers'
import CalendarView from '@/components/calendar/CalendarView'
import type { Platform, ContentStatus } from '@/types/database.types'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; client?: string; platform?: string; status?: string; assignee?: string }>
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

  // Get content_item IDs where a visible user is in content_assignees
  let coContentIds: string[] = []
  if (visibleIds !== null) {
    const { data: coAssigned } = await (supabase as any)
      .from('content_assignees')
      .select('content_item_id')
      .in('user_id', visibleIds)
    coContentIds = (coAssigned ?? []).map((r: any) => r.content_item_id)
  }

  const buildVisibilityFilter = (q: any) => {
    if (visibleIds === null) return q
    const orParts: string[] = [
      `assigned_to.in.(${visibleIds.join(',')})`,
      `assigned_to.is.null`,
      ...(coContentIds.length > 0 ? [`id.in.(${coContentIds.join(',')})`] : []),
    ]
    return q.or(orParts.join(','))
  }

  // ── Month items (for Calendar + List views) ──
  let monthQuery = (supabase as any)
    .from('content_items')
    .select('*, client:clients(name,slug,id,logo_url), assignee:profiles!content_items_assigned_to_fkey(full_name), content_assignees(user_id, user:profiles!content_assignees_user_id_fkey(id,full_name,avatar_url))')
    .gte('publish_at', startOfMonth)
    .lte('publish_at', endOfMonth)
    .order('publish_at', { ascending: true })

  monthQuery = buildVisibilityFilter(monthQuery)
  if (params.client)   monthQuery = monthQuery.eq('client_id', params.client)
  if (params.platform) monthQuery = monthQuery.eq('platform', params.platform as Platform)
  if (params.status)   monthQuery = monthQuery.eq('status', params.status as ContentStatus)
  if (params.assignee) monthQuery = monthQuery.eq('assigned_to', params.assignee)

  // ── Board items (all non-cancelled, no date filter) ──
  let boardQuery = (supabase as any)
    .from('content_items')
    .select('*, client:clients(name,slug,id,logo_url), assignee:profiles!content_items_assigned_to_fkey(full_name,avatar_url)')
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false })

  boardQuery = buildVisibilityFilter(boardQuery)
  if (params.client)   boardQuery = boardQuery.eq('client_id', params.client)
  if (params.assignee) boardQuery = boardQuery.eq('assigned_to', params.assignee)

  const [
    { data: rawItems },
    { data: rawBoardItems },
    { data: rawClients },
    { data: rawProfiles },
  ] = await Promise.all([
    monthQuery,
    boardQuery,
    supabase.from('clients').select('id,name,parent_client_id').not('status', 'eq', 'churned').order('name'),
    supabase.from('profiles').select('id,full_name').eq('is_active', true).order('full_name'),
  ])

  return (
    <div className="p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <CalendarView
          items={(rawItems ?? []) as Parameters<typeof CalendarView>[0]['items']}
          boardItems={(rawBoardItems ?? []) as any[]}
          clients={(rawClients ?? []) as { id: string; name: string; parent_client_id?: string | null }[]}
          profiles={(rawProfiles ?? []) as { id: string; full_name: string }[]}
          year={year}
          month={month}
          canApprove={profile?.role === 'admin' || profile?.role === 'manager'}
          currentUserId={user.id}
          filters={{ client: params.client, platform: params.platform, status: params.status, assignee: params.assignee }}
        />
      </div>
    </div>
  )
}
