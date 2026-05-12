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
    { key: 'scheduled', label: 'Scheduled',  numColor: 'text-violet-700',  bg: 'bg-violet-50',  dotColor: 'bg-violet-500' },
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

  return (
    <div className="p-6">
      {/* Greeting — no box, sits directly on gradient */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 px-2 mb-8">
        <div>
          <h1 className="text-[1.75rem] font-bold text-slate-900 tracking-tight leading-tight">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">{todayLabel}</p>
        </div>

        {/* Hero stats */}
        <div className="flex gap-10 sm:gap-14">
          {heroStats.map(({ label, value, href, warn }) => (
            <Link key={label} href={href} className="text-center group">
              <p className={`text-4xl font-bold tabular-nums leading-none tracking-tight transition-opacity group-hover:opacity-60 ${warn ? 'text-red-500' : 'text-slate-900'}`}>
                {value}
              </p>
              <p className="text-[11px] text-slate-500 mt-2 whitespace-nowrap font-medium uppercase tracking-wide">
                {label}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* 3-col cards row — My Tasks (wide) + Upcoming Content + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-5">

        {/* My Tasks — wider (2 cols) */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">My Tasks</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Things waiting for you</p>
            </div>
            <Link href="/app/tasks" className="text-xs text-slate-400 hover:text-violet-600 transition-colors">View all →</Link>
          </div>
          {myTasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No pending tasks 🎉</p>
          ) : (
            <div className="bg-slate-50 rounded-xl overflow-hidden">
              {myTasks.map((task, i) => {
                const priority = TASK_PRIORITIES.find(p => p.value === task.priority)
                return (
                  <Link key={task.id} href={`/app/tasks/${task.id}`}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-violet-50 group transition-colors ${i !== 0 ? 'border-t border-white' : ''}`}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priority?.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-800 group-hover:text-slate-900 truncate font-medium">{task.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{dueDateLabel(task.due_date)}{task.client ? ` · ${task.client.name}` : ''}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming Content */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Upcoming Content</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Scheduled for publishing</p>
            </div>
            <Link href="/app/calendar" className="text-xs text-slate-400 hover:text-violet-600 transition-colors">View all →</Link>
          </div>
          {upcomingContent.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No scheduled content</p>
          ) : (
            <div className="bg-slate-50 rounded-xl overflow-hidden">
              {upcomingContent.map((item, i) => {
                const status = CONTENT_STATUSES.find(s => s.value === item.status)
                return (
                  <Link key={item.id} href={`/app/calendar/${item.id}`}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-violet-50 group transition-colors ${i !== 0 ? 'border-t border-white' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 group-hover:text-slate-900 truncate font-medium">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
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

        {/* Recent Activity — narrow (1 col) */}
        <div className="lg:col-span-1 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Activity</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Latest updates</p>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No activity yet</p>
          ) : (
            <div className="bg-slate-50 rounded-xl overflow-hidden">
              {recentActivity.slice(0, 6).map((log, i) => (
                <div key={log.id} className={`px-3 py-2.5 ${i !== 0 ? 'border-t border-white' : ''}`}>
                  <p className="text-xs text-slate-700 leading-snug">
                    <span className="font-semibold">{log.actor?.full_name?.split(' ')[0] ?? 'Someone'}</span>
                    {' '}{log.action.replace(/_/g, ' ')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Pipeline */}
      <div className="mb-5">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-5">Content Pipeline</h3>
          <div className="grid grid-cols-5 gap-3">
            {pipelineItems.map(({ key, label, numColor, bg, dotColor }) => {
              const count = pipelineCounts[key]
              return (
                <Link
                  key={key}
                  href={`/app/calendar?status=${key}`}
                  className={`rounded-xl p-4 text-center hover:shadow-sm transition-all cursor-pointer ${bg} group`}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                  </div>
                  <p className={`text-3xl font-bold ${numColor}`}>{count}</p>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Team Overview */}
      {teamByPerson.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Team Overview</h2>
            <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">{teamByPerson.length} member{teamByPerson.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {teamByPerson.map(({ profile, tasksToday, overdueTasks, contentToday, overdueContent }) => (
              <div key={profile.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-700 shrink-0 overflow-hidden">
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                      : profile.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{profile.full_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-violet-50 rounded-xl p-3">
                    <p className="text-[10px] text-violet-400 mb-1.5 font-semibold uppercase tracking-wider">Content</p>
                    <p className="text-2xl font-bold text-violet-700">{contentToday}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-[10px] text-amber-400 mb-1.5 font-semibold uppercase tracking-wider">Tasks</p>
                    <p className="text-2xl font-bold text-amber-700">{tasksToday}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${overdueContent > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <p className={`text-[10px] mb-1.5 font-semibold uppercase tracking-wider ${overdueContent > 0 ? 'text-red-400' : 'text-slate-400'}`}>Late Content</p>
                    <p className={`text-2xl font-bold ${overdueContent > 0 ? 'text-red-600' : 'text-slate-400'}`}>{overdueContent}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${overdueTasks > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <p className={`text-[10px] mb-1.5 font-semibold uppercase tracking-wider ${overdueTasks > 0 ? 'text-red-400' : 'text-slate-400'}`}>Late Tasks</p>
                    <p className={`text-2xl font-bold ${overdueTasks > 0 ? 'text-red-600' : 'text-slate-400'}`}>{overdueTasks}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client Health Grid */}
      {clients.length > 0 && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm p-6 mb-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-5">Client Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {clients.map((client) => {
              const statusDef = CLIENT_STATUSES.find(s => s.value === client.status)
              return (
                <Link key={client.id} href={`/app/clients/${client.slug}`}
                  className="bg-slate-50 hover:bg-violet-50 rounded-xl p-4 transition-colors group">
                  <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-violet-700">{client.name}</p>
                  <div className="flex items-center justify-between mt-3">
                    {statusDef && <StatusBadge label={statusDef.label} color={statusDef.color} />}
                    {client.health_score && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`w-1.5 h-3 rounded-sm ${i <= client.health_score! ? 'bg-lime-400' : 'bg-slate-200'}`} />
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
