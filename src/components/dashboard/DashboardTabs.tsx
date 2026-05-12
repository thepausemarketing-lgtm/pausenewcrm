'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ListTodo, CalendarDays, BarChart2, Users, Activity, Building2 } from 'lucide-react'
import StatusBadge from '@/components/shared/StatusBadge'

// ── Types (minimal, passed from server) ─────────────────────────────────────
interface HeroStat  { label: string; value: number; href: string; warn: boolean }
interface TaskItem  { id: string; title: string; priority: string; status: string; due_date: string | null; client: { name: string; slug: string } | null }
interface ContentItem { id: string; title: string; status: string; publish_at: string | null; client: { name: string; slug: string } | null }
interface PipelineItem { key: string; label: string; numColor: string; bg: string; dotColor: string; count: number }
interface TeamMember { id: string; full_name: string; avatar_url: string | null; contentToday: number; tasksToday: number; overdueContent: number; overdueTasks: number }
interface ClientItem { id: string; name: string; slug: string; status: string; health_score: number | null }
interface ActivityItem { id: string; actorName: string; action: string; createdAt: string }
interface TaskPriority { value: string; label: string; color: string }
interface ContentStatus { value: string; label: string; color: string }
interface ClientStatus  { value: string; label: string; color: string }

interface Props {
  greeting: string
  firstName: string
  todayLabel: string
  heroStats: HeroStat[]
  tasks: TaskItem[]
  content: ContentItem[]
  pipeline: PipelineItem[]
  team: TeamMember[]
  clients: ClientItem[]
  activity: ActivityItem[]
  taskPriorities: TaskPriority[]
  contentStatuses: ContentStatus[]
  clientStatuses: ClientStatus[]
}

const TABS = [
  { id: 'tasks',    label: 'My Tasks',          icon: ListTodo   },
  { id: 'content',  label: 'Upcoming Content',   icon: CalendarDays },
  { id: 'pipeline', label: 'Content Pipeline',   icon: BarChart2  },
  { id: 'team',     label: 'Team Overview',      icon: Users      },
  { id: 'activity', label: 'Activity',           icon: Activity   },
  { id: 'clients',  label: 'Client Health',      icon: Building2  },
]

// Shared card class — solid approximated color so tab notch corners blend perfectly
const card = 'bg-[rgb(243,245,249)] rounded-2xl border border-white/70 shadow-[0_4px_24px_rgba(0,0,0,0.06)]'
// Inner card for pipeline/team grids nested inside the main card
const innerCard = 'bg-white/50 rounded-xl border border-white/60'

function dueDateColor(due: string | null) {
  if (!due) return 'text-gray-400'
  const d = new Date(due)
  const now = new Date()
  if (d < now) return 'text-red-500'
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diff <= 1) return 'text-amber-500'
  return 'text-gray-400'
}

function dueDateLabel(due: string | null) {
  if (!due) return 'No due date'
  const d = new Date(due)
  const now = new Date()
  if (d < now) {
    const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    return days === 0 ? 'Due today' : `Overdue ${d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}`
  }
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function DashboardTabs({
  greeting, firstName, todayLabel, heroStats,
  tasks, content, pipeline, team, clients, activity,
  taskPriorities, contentStatuses, clientStatuses,
}: Props) {
  const [activeTab, setActiveTab] = useState('tasks')

  return (
    <div className="p-6 min-h-full">

      {/* ── Hero Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Your workspace</p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <h1 className="text-[2rem] font-bold text-gray-900 tracking-tight leading-tight">
            {greeting}, {firstName}! 👋
          </h1>
          {/* Hero stats */}
          <div className="flex gap-8 sm:gap-12 pb-1">
            {heroStats.map(({ label, value, href, warn }) => (
              <Link key={label} href={href} className="text-center group">
                <p className={`text-3xl font-bold tabular-nums leading-none tracking-tight group-hover:opacity-60 transition-opacity ${warn ? 'text-red-500' : 'text-gray-900'}`}>
                  {value}
                </p>
                <p className="text-[10px] text-gray-400 mt-1.5 font-semibold uppercase tracking-widest whitespace-nowrap">
                  {label}
                </p>
              </Link>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-1.5">{todayLabel}</p>
      </div>

      {/* ── Tab bar — no container bg, tabs float clean above the card ─────── */}
      <div className="flex justify-center items-end gap-1 relative z-10 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 text-sm font-medium transition-all ${
              activeTab === id
                ? 'tab-active-shape bg-[rgb(243,245,249)] border-t border-l border-r border-white/70 shadow-[0_-2px_16px_rgba(0,0,0,0.07)] px-6 py-3.5 -mb-px text-gray-900 font-semibold relative z-10'
                : 'px-5 py-2.5 text-gray-400 hover:text-gray-700 hover:bg-white/30 rounded-xl'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Card — no top border, active tab overlaps and covers the join ────── */}
      <div className={`${card} border-t-0 p-0 overflow-hidden relative z-0`}>

        {/* Tab panels */}
        <div>

          {/* MY TASKS */}
          {activeTab === 'tasks' && (
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/40">
                <div>
                  <h2 className="font-semibold text-gray-900">My Tasks</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{tasks.length} pending task{tasks.length !== 1 ? 's' : ''}</p>
                </div>
                <Link href="/app/tasks" className="text-xs font-semibold bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-700 transition-colors">
                  View all →
                </Link>
              </div>
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-16">No pending tasks 🎉</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100/60">
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-6 py-3">Task</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Priority</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Due</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Client</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const prio = taskPriorities.find(p => p.value === task.priority)
                      return (
                        <tr key={task.id} className="border-b border-gray-50/80 last:border-0 hover:bg-white/40 transition-colors group">
                          <td className="px-6 py-3.5">
                            <Link href={`/app/tasks/${task.id}`} className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: prio?.color ?? '#ccc' }} />
                              <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{task.title}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs font-medium capitalize" style={{ color: prio?.color ?? '#999' }}>{task.priority}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs font-medium ${dueDateColor(task.due_date)}`}>{dueDateLabel(task.due_date)}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            {task.client
                              ? <Link href={`/app/clients/${task.client.slug}`} className="text-xs text-gray-500 hover:text-gray-800">{task.client.name}</Link>
                              : <span className="text-xs text-gray-300">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* UPCOMING CONTENT */}
          {activeTab === 'content' && (
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/40">
                <div>
                  <h2 className="font-semibold text-gray-900">Upcoming Content</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Scheduled for publishing</p>
                </div>
                <Link href="/app/calendar" className="text-xs font-semibold bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-700 transition-colors">
                  Open calendar →
                </Link>
              </div>
              {content.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-16">No upcoming content</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100/60">
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-6 py-3">Title</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Publish Date</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Status</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Client</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.map((item) => {
                      const st = contentStatuses.find(s => s.value === item.status)
                      return (
                        <tr key={item.id} className="border-b border-gray-50/80 last:border-0 hover:bg-white/40 transition-colors">
                          <td className="px-6 py-3.5">
                            <Link href={`/app/calendar/${item.id}`} className="text-sm font-medium text-gray-800 hover:text-gray-900">{item.title}</Link>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-500">
                            {item.publish_at ? new Date(item.publish_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            {st && <StatusBadge label={st.label} color={st.color} />}
                          </td>
                          <td className="px-4 py-3.5">
                            {item.client
                              ? <Link href={`/app/clients/${item.client.slug}`} className="text-xs text-gray-500 hover:text-gray-800">{item.client.name}</Link>
                              : <span className="text-xs text-gray-300">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* CONTENT PIPELINE */}
          {activeTab === 'pipeline' && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-5 gap-3">
                {pipeline.map(({ key, label, numColor, dotColor, count }) => (
                  <Link key={key} href={`/app/calendar?status=${key}`}
                    className="bg-white/50 rounded-xl border border-white/60 p-5 text-center hover:bg-white/70 transition-all">
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
                    </div>
                    <p className={`text-4xl font-bold ${numColor} leading-none`}>{count}</p>
                    <p className="text-xs text-gray-400 mt-1.5">items</p>
                  </Link>
                ))}
              </div>
              {/* Distribution bar */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Distribution</p>
                <div className="flex rounded-full overflow-hidden h-2.5 bg-gray-100 mb-3">
                  {pipeline.map(({ key, dotColor, count }) => {
                    const total = pipeline.reduce((s, p) => s + p.count, 0)
                    const pct = total ? (count / total) * 100 : 0
                    return pct > 0 ? (
                      <div key={key} className={`h-full ${dotColor}`} style={{ width: `${pct}%` }} />
                    ) : null
                  })}
                </div>
                <div className="flex gap-5 flex-wrap">
                  {pipeline.map(({ key, label, dotColor, count }) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="text-xs font-bold text-gray-800 ml-0.5">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TEAM OVERVIEW */}
          {activeTab === 'team' && (
            <div className="p-6">
              {team.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">No team members to display</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {team.map((member) => (
                    <div key={member.id} className="bg-white/50 rounded-xl border border-white/60 overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/40">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 shrink-0 overflow-hidden">
                          {member.avatar_url
                            ? <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                            : member.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{member.full_name}</p>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-y divide-white/40">
                        {[
                          { label: 'Content Today',  value: member.contentToday,   warn: false },
                          { label: 'Tasks Today',    value: member.tasksToday,     warn: false },
                          { label: 'Late Content',   value: member.overdueContent, warn: member.overdueContent > 0 },
                          { label: 'Late Tasks',     value: member.overdueTasks,   warn: member.overdueTasks > 0 },
                        ].map(({ label, value, warn }) => (
                          <div key={label} className={`px-5 py-4 ${warn ? 'bg-red-50/60' : ''}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${warn ? 'text-red-400' : 'text-gray-400'}`}>{label}</p>
                            <p className={`text-2xl font-bold ${warn ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACTIVITY */}
          {activeTab === 'activity' && (
            <>
              <div className="px-6 py-4 border-b border-white/40">
                <h2 className="font-semibold text-gray-900">Recent Activity</h2>
                <p className="text-xs text-gray-400 mt-0.5">Everything happening in your workspace</p>
              </div>
              {activity.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-16">No activity yet</p>
              ) : (
                <div className="divide-y divide-gray-50/80">
                  {activity.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-white/30 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0 mt-0.5">
                        {log.actorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">{log.actorName}</span>
                          {' '}{log.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* CLIENT HEALTH */}
          {activeTab === 'clients' && (
            <div className="p-6">
              {clients.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">No active clients</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {clients.map((client) => {
                    const st = clientStatuses.find(s => s.value === client.status)
                    return (
                      <Link key={client.id} href={`/app/clients/${client.slug}`}
                        className="bg-white/50 rounded-xl border border-white/60 p-4 hover:bg-white/70 transition-all group">
                        <p className="font-semibold text-gray-900 truncate group-hover:text-gray-700 mb-3 text-sm">{client.name}</p>
                        <div className="flex items-center justify-between">
                          {st && <StatusBadge label={st.label} color={st.color} />}
                          {client.health_score && (
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(i => (
                                <div key={i} className={`w-1.5 h-3.5 rounded-sm ${i <= client.health_score! ? 'bg-gray-800' : 'bg-gray-200'}`} />
                              ))}
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>{/* /tab panels */}
      </div>{/* /unified card */}
    </div>
  )
}
