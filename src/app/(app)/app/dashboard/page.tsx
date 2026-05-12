import { createClient } from '@/lib/supabase/server'
import { getVisibleUserIds } from '@/lib/supabase/helpers'
import { formatDate, dueDateLabel } from '@/lib/utils'
import { TASK_PRIORITIES, CONTENT_STATUSES, CLIENT_STATUSES } from '@/lib/constants'
import Link from 'next/link'
import StatusBadge from '@/components/shared/StatusBadge'
import type { Task, ContentItem, ActivityLog } from '@/types/database.types'
import { Building2, ListTodo, CalendarDays, AlertTriangle } from 'lucide-react'

type TaskWithClient = Task & { client?: { name: string; slug: string } | null }
type ContentWithClient = ContentItem & { client?: { name: string; slug: string } | null }
type ActivityWithActor = ActivityLog & { actor?: { full_name: string } | null }

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]

  const [
    { count: activeClients },
    { count: tasksDueToday },
    { count: contentThisWeek },
    { count: overdueTasks },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('due_date', today).not('status', 'in', '(done,cancelled)'),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).gte('publish_at', today).lte('publish_at', nextWeek),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).lt('due_date', today).not('status', 'in', '(done,cancelled)'),
  ])

  return { activeClients, tasksDueToday, contentThisWeek, overdueTasks }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get visible user IDs (self + subordinates, or null for admin)
  const visibleIds = await getVisibleUserIds(supabase, user.id)
  // Subordinates = visible IDs minus self
  const subordinateIds = visibleIds ? visibleIds.filter(id => id !== user.id) : null

  const [stats, myTasksRes, upcomingContentRes, recentActivityRes, clientsRes] = await Promise.all([
    getStats(supabase),
    supabase
      .from('tasks')
      .select('*, client:clients(name,slug), assigned_profile:profiles!tasks_assigned_to_fkey(full_name)')
      .eq('assigned_to', user.id)
      .not('status', 'in', '(done,cancelled)')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from('content_items')
      .select('*, client:clients(name,slug)')
      .gte('publish_at', new Date().toISOString())
      .in('status', ['approved', 'scheduled', 'published'])
      .order('publish_at', { ascending: true })
      .limit(7),
    supabase
      .from('activity_logs')
      .select('*, actor:profiles!activity_logs_actor_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('clients')
      .select('id, name, slug, status, health_score')
      .eq('status', 'active')
      .order('name')
      .limit(8),
  ])

  const myTasks = (myTasksRes.data ?? []) as TaskWithClient[]
  const upcomingContent = (upcomingContentRes.data ?? []) as ContentWithClient[]
  const recentActivity = (recentActivityRes.data ?? []) as ActivityWithActor[]
  const clients = clientsRes.data ?? []

  // Content Pipeline counts
  const { data: pipelineData } = await supabase
    .from('content_items')
    .select('status')
    .not('status', 'eq', 'cancelled')

  const pipelineStatuses = ['draft', 'in_review', 'approved', 'scheduled', 'published'] as const
  type PipelineStatus = typeof pipelineStatuses[number]
  const pipelineCounts = pipelineStatuses.reduce<Record<PipelineStatus, number>>((acc, s) => {
    acc[s] = (pipelineData ?? []).filter((item: { status: string }) => item.status === s).length
    return acc
  }, { draft: 0, in_review: 0, approved: 0, scheduled: 0, published: 0 })

  const pipelineItems: { key: PipelineStatus; label: string; numColor: string; bg: string; dotColor: string }[] = [
    { key: 'draft',     label: 'Draft',      numColor: 'text-gray-700',    bg: 'bg-gray-50',    dotColor: 'bg-gray-300' },
    { key: 'in_review', label: 'In Review',  numColor: 'text-amber-700',   bg: 'bg-amber-50',   dotColor: 'bg-amber-400' },
    { key: 'approved',  label: 'Approved',   numColor: 'text-blue-700',    bg: 'bg-blue-50',    dotColor: 'bg-blue-500' },
    { key: 'scheduled', label: 'Scheduled',  numColor: 'text-indigo-700',  bg: 'bg-indigo-50',  dotColor: 'bg-indigo-400' },
    { key: 'published', label: 'Published',  numColor: 'text-green-700',   bg: 'bg-green-50',   dotColor: 'bg-green-500' },
  ]

  // ── Team Overview ────────────────────────────────────────────────────────────
  // For admins (visibleIds === null) show ALL active profiles except self
  let teamMemberIds: string[] = []
  let allProfiles: { id: string; full_name: string; avatar_url: string | null }[] = []

  if (subordinateIds === null) {
    // Admin: fetch all active profiles except self
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('is_active', true)
      .neq('id', user.id)
    allProfiles = profiles ?? []
    teamMemberIds = allProfiles.map(p => p.id)
  } else if (subordinateIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', subordinateIds)
      .eq('is_active', true)
    allProfiles = profiles ?? []
    teamMemberIds = allProfiles.map(p => p.id)
  }

  // Fetch tasks + content stats for team members
  // Tasks can be assigned via tasks.assigned_to OR task_assignees junction table — check both
  type TeamRow = { id: string; due_date: string | null; status: string }
  type ContentRow = { assigned_to: string | null; publish_at: string | null; live_links: Record<string, string> | null }
  type AssigneeRow = { task_id: string; user_id: string; task: { id: string; due_date: string | null; status: string } | null }

  // Map: userId → Set of task ids
  const personTaskMap: Record<string, Set<string>> = {}
  // Map: taskId → task data
  const taskDataMap: Record<string, TeamRow> = {}

  let rawTeamContent: ContentRow[] = []

  const today = new Date().toISOString().split('T')[0]

  if (teamMemberIds.length > 0) {
    const [directTasksRes, junctionTasksRes, teamContentRes] = await Promise.all([
      // Tasks assigned directly via assigned_to column
      supabase
        .from('tasks')
        .select('id, assigned_to, due_date, status')
        .in('assigned_to', teamMemberIds)
        .not('status', 'in', '(done,cancelled)'),
      // Tasks assigned via task_assignees junction table
      (supabase as any)
        .from('task_assignees')
        .select('task_id, user_id, task:tasks!task_assignees_task_id_fkey(id, due_date, status)')
        .in('user_id', teamMemberIds),
      supabase
        .from('content_items')
        .select('assigned_to, publish_at, live_links, status')
        .in('assigned_to', teamMemberIds)
        .not('status', 'in', '(cancelled)'),
    ])

    // Build direct task assignments
    for (const t of (directTasksRes.data ?? []) as any[]) {
      if (!['done', 'cancelled'].includes(t.status)) {
        taskDataMap[t.id] = { id: t.id, due_date: t.due_date, status: t.status }
        if (!personTaskMap[t.assigned_to]) personTaskMap[t.assigned_to] = new Set()
        personTaskMap[t.assigned_to].add(t.id)
      }
    }

    // Merge junction table assignments
    for (const r of (junctionTasksRes.data ?? []) as AssigneeRow[]) {
      if (!r.task || ['done', 'cancelled'].includes(r.task.status)) continue
      taskDataMap[r.task_id] = { id: r.task_id, due_date: r.task.due_date, status: r.task.status }
      if (!personTaskMap[r.user_id]) personTaskMap[r.user_id] = new Set()
      personTaskMap[r.user_id].add(r.task_id)
    }

    rawTeamContent = (teamContentRes.data ?? []) as ContentRow[]
  }

  // Compute per-person stats
  const teamByPerson = allProfiles.map(profile => {
    const taskIds = Array.from(personTaskMap[profile.id] ?? [])
    const myTasks = taskIds.map(id => taskDataMap[id]).filter(Boolean)
    const myContent = rawTeamContent.filter(c => c.assigned_to === profile.id)

    const tasksToday    = myTasks.filter(t => t.due_date === today).length
    const overdueTasks  = myTasks.filter(t => t.due_date && t.due_date < today).length
    const contentToday  = myContent.filter(c => c.publish_at?.startsWith(today)).length
    const overdueContent = myContent.filter(c => {
      if (!c.publish_at) return false
      const isPosted = Object.values(c.live_links ?? {}).some(v => v)
      return !isPosted && c.publish_at < new Date().toISOString()
    }).length

    return { profile, tasksToday, overdueTasks, contentToday, overdueContent }
  })

  // Greeting
  const { data: currentProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const firstName = (currentProfile?.full_name ?? '').split(' ')[0] || 'there'
  const hourNow = new Date().getHours()
  const greeting = hourNow < 12 ? 'Good morning' : hourNow < 17 ? 'Good afternoon' : 'Good evening'
  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const heroStats = [
    { label: 'Active clients',    value: stats.activeClients ?? 0,  href: '/app/clients?status=active', warn: false },
    { label: 'Due today',         value: stats.tasksDueToday ?? 0,   href: '/app/tasks?date=today',      warn: false },
    { label: 'Content this week', value: stats.contentThisWeek ?? 0, href: '/app/calendar',              warn: false },
    { label: 'Overdue items',     value: stats.overdueTasks ?? 0,    href: '/app/tasks?date=overdue',    warn: (stats.overdueTasks ?? 0) > 0 },
  ]

  // Card style — frosted glass so it lifts off the gray bg
  const card = 'bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-sm p-6'

  return (
    <div className="p-6 bg-white min-h-full">

      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 px-1 mb-8">
        <div>
          <h1 className="text-[1.75rem] font-bold text-gray-900 tracking-tight leading-tight">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">{todayLabel}</p>
        </div>
        <div className="flex gap-10 sm:gap-14">
          {heroStats.map(({ label, value, href, warn }) => (
            <Link key={label} href={href} className="text-center group">
              <p className={`text-4xl font-bold tabular-nums leading-none tracking-tight group-hover:opacity-60 transition-opacity ${warn ? 'text-red-500' : 'text-gray-900'}`}>
                {value}
              </p>
              <p className="text-[10px] text-gray-400 mt-2 whitespace-nowrap font-semibold uppercase tracking-widest">
                {label}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Main row — Tasks + Content + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">

        {/* My Tasks */}
        <div className={`lg:col-span-2 ${card}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900">My Tasks</h3>
              <p className="text-xs text-gray-400 mt-0.5">Things waiting for you</p>
            </div>
            <Link href="/app/tasks"
              className="text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-full hover:bg-gray-700 transition-colors">
              View all
            </Link>
          </div>
          {myTasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No pending tasks 🎉</p>
          ) : (
            <div className="space-y-1">
              {myTasks.map((task) => {
                const priority = TASK_PRIORITIES.find(p => p.value === task.priority)
                return (
                  <Link key={task.id} href={`/app/tasks/${task.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 group transition-colors">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priority?.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{dueDateLabel(task.due_date)}{task.client ? ` · ${task.client.name}` : ''}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming Content */}
        <div className={`lg:col-span-2 ${card}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900">Upcoming Content</h3>
              <p className="text-xs text-gray-400 mt-0.5">Scheduled for publishing</p>
            </div>
            <Link href="/app/calendar"
              className="text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-full hover:bg-gray-700 transition-colors">
              View all
            </Link>
          </div>
          {upcomingContent.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No scheduled content</p>
          ) : (
            <div className="space-y-1">
              {upcomingContent.map((item) => {
                const status = CONTENT_STATUSES.find(s => s.value === item.status)
                return (
                  <Link key={item.id} href={`/app/calendar/${item.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 group transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.publish_at ? formatDate(item.publish_at, 'dd/MM') : '—'}
                        {item.client ? ` · ${item.client.name}` : ''}
                      </p>
                    </div>
                    {status && <StatusBadge label={status.label} color={status.color} />}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className={`lg:col-span-1 ${card}`}>
          <div className="mb-5">
            <h3 className="font-semibold text-gray-900">Activity</h3>
            <p className="text-xs text-gray-400 mt-0.5">Latest updates</p>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No activity yet</p>
          ) : (
            <div className="space-y-1">
              {recentActivity.slice(0, 6).map((log) => (
                <div key={log.id} className="px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <p className="text-xs text-gray-700 leading-snug">
                    <span className="font-semibold">{log.actor?.full_name?.split(' ')[0] ?? 'Someone'}</span>
                    {' '}{log.action.replace(/_/g, ' ')}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Pipeline */}
      <div className={`${card} mb-4`}>
        <h3 className="font-semibold text-gray-900 mb-5">Content Pipeline</h3>
        <div className="grid grid-cols-5 gap-3">
          {pipelineItems.map(({ key, label, numColor, bg, dotColor }) => {
            const count = pipelineCounts[key]
            return (
              <Link key={key} href={`/app/calendar?status=${key}`}
                className={`${bg} rounded-xl p-4 text-center hover:brightness-95 transition-all`}>
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
                </div>
                <p className={`text-3xl font-bold ${numColor}`}>{count}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Team Overview */}
      {teamByPerson.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-semibold text-gray-900">Team Overview</h2>
            <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full font-medium">{teamByPerson.length} member{teamByPerson.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {teamByPerson.map(({ profile, tasksToday, overdueTasks, contentToday, overdueContent }) => (
              <div key={profile.id} className={`${card}`}>
                <div className="flex items-center gap-3 mb-5 bg-gray-50 -mx-6 -mt-6 px-6 pt-5 pb-4 rounded-t-2xl">
                  <div className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center text-sm font-bold text-gray-700 shrink-0 overflow-hidden border border-white">
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                      : profile.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold text-gray-900">{profile.full_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Content', value: contentToday, warn: false },
                    { label: 'Tasks',   value: tasksToday,   warn: false },
                    { label: 'Late Content', value: overdueContent, warn: overdueContent > 0 },
                    { label: 'Late Tasks',   value: overdueTasks,   warn: overdueTasks > 0 },
                  ].map(({ label, value, warn }) => (
                    <div key={label} className={`rounded-xl p-3 ${warn ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${warn ? 'text-red-400' : 'text-gray-400'}`}>{label}</p>
                      <p className={`text-2xl font-bold ${warn ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client Health */}
      {clients.length > 0 && (
        <div className={`${card} mb-4`}>
          <h3 className="font-semibold text-gray-900 mb-5">Client Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {clients.map((client) => {
              const statusDef = CLIENT_STATUSES.find(s => s.value === client.status)
              return (
                <Link key={client.id} href={`/app/clients/${client.slug}`}
                  className="bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors group">
                  <p className="font-semibold text-gray-900 truncate group-hover:text-gray-700">{client.name}</p>
                  <div className="flex items-center justify-between mt-3">
                    {statusDef && <StatusBadge label={statusDef.label} color={statusDef.color} />}
                    {client.health_score && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(j => (
                          <div key={j} className={`w-1.5 h-3 rounded-sm ${j <= client.health_score! ? 'bg-gray-700' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
