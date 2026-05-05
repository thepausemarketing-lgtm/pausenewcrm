import { createClient } from '@/lib/supabase/server'
import { formatDate, dueDateLabel } from '@/lib/utils'
import { TASK_PRIORITIES, CONTENT_STATUSES, CLIENT_STATUSES } from '@/lib/constants'
import Link from 'next/link'
import StatusBadge from '@/components/shared/StatusBadge'
import type { Task, ContentItem, ActivityLog } from '@/types/database.types'

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

  const kpis = [
    { label: 'Active Clients', value: stats.activeClients ?? 0 },
    { label: 'Tasks Due Today', value: stats.tasksDueToday ?? 0 },
    { label: 'Content This Week', value: stats.contentThisWeek ?? 0 },
    { label: 'Overdue Tasks', value: stats.overdueTasks ?? 0 },
  ]

  return (
    <div className="p-6">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpis.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-3">{label}</p>
            <p className="text-4xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* My Tasks */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-800">My Tasks</h3>
            <Link href="/app/tasks" className="text-xs text-gray-400 hover:text-gray-600">View all</Link>
          </div>
          {myTasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No pending tasks</p>
          ) : (
            <div>
              {myTasks.map((task) => {
                const priority = TASK_PRIORITIES.find(p => p.value === task.priority)
                return (
                  <Link key={task.id} href={`/app/tasks/${task.id}`} className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0 group">
                    <div className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priority?.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 group-hover:text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400">{dueDateLabel(task.due_date)}{task.client ? ` · ${task.client.name}` : ''}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming Content */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-800">Upcoming Content</h3>
            <Link href="/app/calendar" className="text-xs text-gray-400 hover:text-gray-600">View all</Link>
          </div>
          {upcomingContent.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No scheduled content</p>
          ) : (
            <div>
              {upcomingContent.map((item) => {
                const status = CONTENT_STATUSES.find(s => s.value === item.status)
                return (
                  <Link key={item.id} href={`/app/calendar/${item.id}`} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-0 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 group-hover:text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-400">
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

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-800">Recent Activity</h3>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
          ) : (
            <div>
              {recentActivity.slice(0, 8).map((log) => (
                <div key={log.id} className="flex gap-2.5 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 leading-snug">
                      <span className="font-medium">{log.actor?.full_name ?? 'Someone'}</span>
                      {' '}{log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Health Grid */}
      {clients.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-5">Client Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {clients.map((client) => {
              const statusDef = CLIENT_STATUSES.find(s => s.value === client.status)
              return (
                <Link key={client.id} href={`/app/clients/${client.slug}`}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    {statusDef && <StatusBadge label={statusDef.label} color={statusDef.color} />}
                    {client.health_score && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`w-1.5 h-3 rounded-sm ${i <= client.health_score! ? 'bg-green-400' : 'bg-gray-100'}`} />
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
