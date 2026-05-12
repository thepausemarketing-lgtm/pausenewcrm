import { createClient } from '@/lib/supabase/server'
import { getVisibleUserIds } from '@/lib/supabase/helpers'
import { TASK_PRIORITIES, CONTENT_STATUSES } from '@/lib/constants'
import DashboardTabs from '@/components/dashboard/DashboardTabs'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today    = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
  const nowIso   = new Date().toISOString()

  // ── Fire every independent query in ONE parallel batch ───────────────────────
  const [
    profileRes,
    visibleIds,
    activeClientsRes,
    tasksDueTodayRes,
    contentThisWeekRes,
    overdueTasksRes,
    myTasksRes,
    contentRes,
    pipelineRes,
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    getVisibleUserIds(supabase, user.id),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('due_date', today).not('status', 'in', '(done,cancelled)'),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).gte('publish_at', today).lte('publish_at', nextWeek),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).lt('due_date', today).not('status', 'in', '(done,cancelled)'),
    supabase.from('tasks')
      .select('id, title, priority, status, due_date, client:clients(name,slug)')
      .eq('assigned_to', user.id)
      .not('status', 'in', '(done,cancelled)')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(20),
    supabase.from('content_items')
      .select('id, title, status, publish_at, client:clients(name,slug)')
      .gte('publish_at', nowIso)
      .in('status', ['approved', 'scheduled', 'published'])
      .order('publish_at', { ascending: true })
      .limit(20),
    supabase.from('content_items').select('status').not('status', 'eq', 'cancelled'),
  ])

  // ── Greeting ─────────────────────────────────────────────────────────────────
  const firstName = (profileRes.data?.full_name ?? '').split(' ')[0] || 'there'
  const hourNow   = new Date().getHours()
  const greeting  = hourNow < 12 ? 'Good morning' : hourNow < 17 ? 'Good afternoon' : 'Good evening'
  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // ── Hero stats ────────────────────────────────────────────────────────────────
  const heroStats = [
    { label: 'Active clients',    value: activeClientsRes.count  ?? 0, href: '/app/clients?status=active', warn: false },
    { label: 'Due today',         value: tasksDueTodayRes.count  ?? 0, href: '/app/tasks?date=today',      warn: false },
    { label: 'Content this week', value: contentThisWeekRes.count ?? 0, href: '/app/calendar',             warn: false },
    { label: 'Overdue items',     value: overdueTasksRes.count   ?? 0, href: '/app/tasks?date=overdue',    warn: (overdueTasksRes.count ?? 0) > 0 },
  ]

  // ── My Tasks ──────────────────────────────────────────────────────────────────
  const tasks = (myTasksRes.data ?? []).map((t: any) => ({
    id: t.id, title: t.title, priority: t.priority,
    status: t.status, due_date: t.due_date, client: t.client ?? null,
  }))

  // ── Upcoming Content ──────────────────────────────────────────────────────────
  const content = (contentRes.data ?? []).map((c: any) => ({
    id: c.id, title: c.title, status: c.status,
    publish_at: c.publish_at, client: c.client ?? null,
  }))

  // ── Content Pipeline ──────────────────────────────────────────────────────────
  const pipelineStatuses = ['draft', 'in_review', 'approved', 'scheduled', 'published'] as const
  type PS = typeof pipelineStatuses[number]
  const pipelineCounts = pipelineStatuses.reduce<Record<PS, number>>((acc, s) => {
    acc[s] = (pipelineRes.data ?? []).filter((i: any) => i.status === s).length
    return acc
  }, { draft: 0, in_review: 0, approved: 0, scheduled: 0, published: 0 })

  const pipeline = [
    { key: 'draft',     label: 'Draft',     numColor: 'text-gray-700',   bg: 'bg-gray-50',   dotColor: 'bg-gray-300',   count: pipelineCounts.draft },
    { key: 'in_review', label: 'In Review', numColor: 'text-amber-700',  bg: 'bg-amber-50',  dotColor: 'bg-amber-400',  count: pipelineCounts.in_review },
    { key: 'approved',  label: 'Approved',  numColor: 'text-blue-700',   bg: 'bg-blue-50',   dotColor: 'bg-blue-500',   count: pipelineCounts.approved },
    { key: 'scheduled', label: 'Scheduled', numColor: 'text-indigo-700', bg: 'bg-indigo-50', dotColor: 'bg-indigo-400', count: pipelineCounts.scheduled },
    { key: 'published', label: 'Published', numColor: 'text-green-700',  bg: 'bg-green-50',  dotColor: 'bg-green-500',  count: pipelineCounts.published },
  ]

  // ── Activity + Team — both depend on visibleIds, run in parallel ──────────────
  const subordinateIds = visibleIds ? visibleIds.filter(id => id !== user.id) : null

  const activityQueryBase = supabase
    .from('activity_logs')
    .select('id, action, entity_type, entity_id, created_at, actor:profiles!activity_logs_actor_id_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(30)

  // Team profiles query (conditional on role)
  const teamProfilesPromise = subordinateIds === null
    ? supabase.from('profiles').select('id, full_name, avatar_url').eq('is_active', true).neq('id', user.id)
    : subordinateIds.length > 0
      ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', subordinateIds).eq('is_active', true)
      : Promise.resolve({ data: [] })

  const [activityRes, teamProfilesRes] = await Promise.all([
    visibleIds ? activityQueryBase.in('actor_id', visibleIds) : activityQueryBase,
    teamProfilesPromise,
  ])

  const activity = (activityRes.data ?? []).map((l: any) => ({
    id: l.id, actorName: l.actor?.full_name ?? 'Someone',
    action: l.action, entityType: l.entity_type ?? null,
    entityId: l.entity_id ?? null, createdAt: l.created_at,
  }))

  // ── Team stats — if there are team members, fetch their tasks + content ───────
  const allProfiles: { id: string; full_name: string; avatar_url: string | null }[] = teamProfilesRes.data ?? []
  const teamMemberIds = allProfiles.map(p => p.id)

  type TeamRow    = { id: string; due_date: string | null; status: string }
  type ContentRow = { assigned_to: string | null; publish_at: string | null; live_links: Record<string, string> | null; status: string }
  type AssigneeRow = { task_id: string; user_id: string; task: { id: string; due_date: string | null; status: string } | null }

  const personTaskMap: Record<string, Set<string>> = {}
  const taskDataMap:   Record<string, TeamRow>     = {}
  let rawTeamContent: ContentRow[] = []

  if (teamMemberIds.length > 0) {
    const [directTasksRes, junctionTasksRes, teamContentRes] = await Promise.all([
      supabase.from('tasks')
        .select('id, assigned_to, due_date, status')
        .in('assigned_to', teamMemberIds)
        .not('status', 'in', '(done,cancelled)'),
      (supabase as any).from('task_assignees')
        .select('task_id, user_id, task:tasks!task_assignees_task_id_fkey(id, due_date, status)')
        .in('user_id', teamMemberIds),
      supabase.from('content_items')
        .select('assigned_to, publish_at, live_links, status')
        .in('assigned_to', teamMemberIds)
        .not('status', 'in', '(cancelled)'),
    ])

    for (const t of (directTasksRes.data ?? []) as any[]) {
      if (!['done', 'cancelled'].includes(t.status)) {
        taskDataMap[t.id] = { id: t.id, due_date: t.due_date, status: t.status }
        if (!personTaskMap[t.assigned_to]) personTaskMap[t.assigned_to] = new Set()
        personTaskMap[t.assigned_to].add(t.id)
      }
    }
    for (const r of (junctionTasksRes.data ?? []) as AssigneeRow[]) {
      if (!r.task || ['done', 'cancelled'].includes(r.task.status)) continue
      taskDataMap[r.task_id] = { id: r.task_id, due_date: r.task.due_date, status: r.task.status }
      if (!personTaskMap[r.user_id]) personTaskMap[r.user_id] = new Set()
      personTaskMap[r.user_id].add(r.task_id)
    }
    rawTeamContent = (teamContentRes.data ?? []) as ContentRow[]
  }

  const team = allProfiles.map(profile => {
    const taskIds  = Array.from(personTaskMap[profile.id] ?? [])
    const myTasks  = taskIds.map(id => taskDataMap[id]).filter(Boolean)
    const myCont   = rawTeamContent.filter(c => c.assigned_to === profile.id)
    return {
      id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url,
      tasksToday:     myTasks.filter(t => t.due_date === today).length,
      overdueTasks:   myTasks.filter(t => t.due_date && t.due_date < today).length,
      contentToday:   myCont.filter(c => c.publish_at?.startsWith(today)).length,
      overdueContent: myCont.filter(c => {
        if (!c.publish_at) return false
        return !Object.values(c.live_links ?? {}).some(v => v) && c.publish_at < nowIso
      }).length,
    }
  })

  return (
    <DashboardTabs
      greeting={greeting}
      firstName={firstName}
      todayLabel={todayLabel}
      heroStats={heroStats}
      tasks={tasks}
      content={content}
      pipeline={pipeline}
      team={team}
      activity={activity}
      taskPriorities={TASK_PRIORITIES}
      contentStatuses={CONTENT_STATUSES}
    />
  )
}
