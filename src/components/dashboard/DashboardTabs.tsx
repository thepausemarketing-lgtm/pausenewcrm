'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ListTodo, CalendarDays, BarChart2, Users, Activity, TrendingUp, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import StatusBadge from '@/components/shared/StatusBadge'

// ── Types ────────────────────────────────────────────────────────────────────
interface HeroStat  { label: string; value: number; href: string; warn: boolean }
interface TaskItem  { id: string; title: string; priority: string; status: string; due_date: string | null; client: { name: string; slug: string } | null }
interface ContentItem { id: string; title: string; status: string; publish_at: string | null; client: { name: string; slug: string } | null }
interface PipelineItem { key: string; label: string; numColor: string; bg: string; dotColor: string; count: number }
interface TeamMember { id: string; full_name: string; avatar_url: string | null; contentToday: number; tasksToday: number; overdueContent: number; overdueTasks: number }
interface ActivityItem { id: string; actorName: string; action: string; entityType: string | null; entityId: string | null; createdAt: string }
interface TaskPriority { value: string; label: string; color: string }
interface ContentStatus { value: string; label: string; color: string }

interface Props {
  greeting: string; firstName: string; todayLabel: string
  heroStats: HeroStat[]; tasks: TaskItem[]; content: ContentItem[]
  pipeline: PipelineItem[]; team: TeamMember[]; activity: ActivityItem[]
  taskPriorities: TaskPriority[]; contentStatuses: ContentStatus[]
}

const TABS = [
  { id: 'tasks',    label: 'My Tasks',        icon: ListTodo    },
  { id: 'content',  label: 'Upcoming Content', icon: CalendarDays },
  { id: 'pipeline', label: 'Content Pipeline', icon: BarChart2   },
  { id: 'team',     label: 'Team Overview',    icon: Users       },
  { id: 'activity', label: 'Activity',         icon: Activity    },
]

const card = 'bg-[rgb(243,245,249)] rounded-2xl border border-white/70 shadow-[0_4px_24px_rgba(0,0,0,0.06)]'

function dueDateColor(due: string | null) {
  if (!due) return 'text-gray-400'
  const d = new Date(due); const now = new Date()
  if (d < now) return 'text-red-500'
  if ((d.getTime() - now.getTime()) / 86400000 <= 1) return 'text-amber-500'
  return 'text-gray-500'
}

function dueDateLabel(due: string | null) {
  if (!due) return 'No date'
  const d = new Date(due); const now = new Date()
  if (d < now) return `Overdue ${d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}`
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function StatChip({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/60 rounded-xl px-4 py-3 border border-white/70 flex-1">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={15} />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardTabs({
  greeting, firstName, todayLabel, heroStats,
  tasks, content, pipeline, team, activity,
  taskPriorities, contentStatuses,
}: Props) {
  const [activeTab, setActiveTab] = useState('tasks')

  // Derived task stats
  const today = new Date().toISOString().split('T')[0]
  const overdueCount   = tasks.filter(t => t.due_date && t.due_date < today).length
  const dueTodayCount  = tasks.filter(t => t.due_date === today).length
  const highPrioCount  = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length
  const doneCount      = tasks.filter(t => t.status === 'done').length

  return (
    <div className="px-6 pb-6 min-h-full">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Your workspace</p>
          <h1 className="text-[2.4rem] font-bold text-gray-900 tracking-tight leading-tight">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-sm text-gray-400 mt-1">{todayLabel}</p>
        </div>
        {/* Hero KPIs */}
        <div className="flex gap-6 sm:gap-10">
          {heroStats.map(({ label, value, href, warn }) => (
            <Link key={label} href={href} className="group text-center">
              <div className="flex items-center justify-center gap-1.5">
                <p className={`text-[2.8rem] font-bold tabular-nums leading-none tracking-tight group-hover:opacity-70 transition-opacity ${warn && value > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                  {value}
                </p>
                {warn && value > 0 && <span className="w-2 h-2 rounded-full bg-red-400 mt-1 shrink-0" />}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 font-semibold uppercase tracking-widest whitespace-nowrap">
                {label}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-center items-end gap-1 relative z-10">
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

      {/* ── Main card ────────────────────────────────────────────────────────── */}
      <div className={`${card} border-t-0 p-0 overflow-hidden relative z-0`}>

        {/* ── MY TASKS ──────────────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <>
            {/* Summary strip */}
            <div className="grid grid-cols-4 gap-3 p-4 border-b border-white/50">
              <StatChip icon={AlertTriangle} label="Overdue"      value={overdueCount}  color="bg-red-50 text-red-500" />
              <StatChip icon={Clock}         label="Due today"    value={dueTodayCount}  color="bg-amber-50 text-amber-500" />
              <StatChip icon={TrendingUp}    label="High priority" value={highPrioCount} color="bg-orange-50 text-orange-500" />
              <StatChip icon={CheckCircle2}  label="Total pending" value={tasks.length}  color="bg-blue-50 text-blue-500" />
            </div>

            {tasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">No pending tasks 🎉</p>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100/60">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">All pending tasks</p>
                  <Link href="/app/tasks" className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">View all →</Link>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100/50">
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-6 py-2.5">Task</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-2.5 w-28">Priority</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-2.5 w-36">Due</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-2.5 w-36">Client</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const prio = taskPriorities.find(p => p.value === task.priority)
                      const isOverdue = task.due_date && task.due_date < today
                      return (
                        <tr key={task.id} className="border-b border-gray-50/80 last:border-0 hover:bg-white/50 transition-colors group">
                          <td className="px-6 py-3">
                            <Link href={`/app/tasks/${task.id}`} className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: prio?.color ?? '#ccc' }} />
                              <span className={`text-sm font-medium group-hover:text-gray-900 transition-colors ${isOverdue ? 'text-gray-700' : 'text-gray-700'}`}>{task.title}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-md" style={{ color: prio?.color ?? '#999', backgroundColor: `${prio?.color ?? '#ccc'}18` }}>
                              {task.priority ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${dueDateColor(task.due_date)}`}>{dueDateLabel(task.due_date)}</span>
                          </td>
                          <td className="px-4 py-3">
                            {task.client
                              ? <Link href={`/app/clients/${task.client.slug}`} className="text-xs text-gray-500 hover:text-gray-800 font-medium">{task.client.name}</Link>
                              : <span className="text-xs text-gray-300">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        {/* ── UPCOMING CONTENT ──────────────────────────────────────────────── */}
        {activeTab === 'content' && (
          <>
            {/* Summary strip */}
            <div className="grid grid-cols-4 gap-3 p-4 border-b border-white/50">
              {(['approved','scheduled','published','in_review'] as const).map(s => {
                const st = contentStatuses.find(x => x.value === s)
                const cnt = content.filter(c => c.status === s).length
                return (
                  <div key={s} className="bg-white/60 rounded-xl px-4 py-3 border border-white/70">
                    <p className="text-2xl font-bold text-gray-900">{cnt}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {st && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color }} />}
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{st?.label ?? s}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {content.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">No upcoming content</p>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100/60">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{content.length} items scheduled</p>
                  <Link href="/app/calendar" className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">Open calendar →</Link>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100/50">
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-6 py-2.5">Title</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-2.5 w-36">Publish Date</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-2.5 w-28">Status</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-2.5 w-36">Client</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.map((item) => {
                      const st = contentStatuses.find(s => s.value === item.status)
                      return (
                        <tr key={item.id} className="border-b border-gray-50/80 last:border-0 hover:bg-white/50 transition-colors">
                          <td className="px-6 py-3">
                            <Link href={`/app/calendar/${item.id}`} className="text-sm font-medium text-gray-700 hover:text-gray-900">{item.title}</Link>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 font-medium">
                            {item.publish_at ? new Date(item.publish_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {st && <StatusBadge label={st.label} color={st.color} />}
                          </td>
                          <td className="px-4 py-3">
                            {item.client
                              ? <Link href={`/app/clients/${item.client.slug}`} className="text-xs text-gray-500 hover:text-gray-800 font-medium">{item.client.name}</Link>
                              : <span className="text-xs text-gray-300">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        {/* ── CONTENT PIPELINE ──────────────────────────────────────────────── */}
        {activeTab === 'pipeline' && (
          <div className="p-5">
            {/* Big KPI cards */}
            <div className="grid grid-cols-5 gap-3 mb-5">
              {pipeline.map(({ key, label, numColor, dotColor, count }) => {
                const total = pipeline.reduce((s, p) => s + p.count, 0)
                const pct = total ? Math.round((count / total) * 100) : 0
                return (
                  <Link key={key} href={`/app/calendar?status=${key}`}
                    className="bg-white/60 rounded-xl border border-white/70 p-5 hover:bg-white/80 transition-all group">
                    <div className="flex items-center gap-1.5 mb-4">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
                    </div>
                    <p className={`text-5xl font-bold ${numColor} leading-none mb-2`}>{count}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">items</p>
                      <p className={`text-xs font-bold ${numColor}`}>{pct}%</p>
                    </div>
                    {/* Mini bar */}
                    <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${dotColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                )
              })}
            </div>
            {/* Distribution bar */}
            <div className="bg-white/60 rounded-xl border border-white/70 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Pipeline Distribution</p>
                <p className="text-xs text-gray-400">{pipeline.reduce((s, p) => s + p.count, 0)} total items</p>
              </div>
              <div className="flex rounded-full overflow-hidden h-3 mb-3 gap-0.5">
                {pipeline.map(({ key, dotColor, count }) => {
                  const total = pipeline.reduce((s, p) => s + p.count, 0)
                  const pct = total ? (count / total) * 100 : 0
                  return pct > 0 ? <div key={key} className={`h-full ${dotColor}`} style={{ width: `${pct}%` }} /> : null
                })}
              </div>
              <div className="flex gap-4 flex-wrap">
                {pipeline.map(({ key, label, dotColor, count }) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-bold text-gray-800">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TEAM OVERVIEW ─────────────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="p-5">
            {team.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No team members to display</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {team.map((member) => {
                  const totalTasks = member.tasksToday + member.overdueTasks
                  const loadPct = totalTasks > 0 ? Math.min(100, Math.round((member.overdueTasks / totalTasks) * 100)) : 0
                  return (
                    <div key={member.id} className="bg-white/60 rounded-xl border border-white/70 overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-white/50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-700 shrink-0 overflow-hidden">
                            {member.avatar_url
                              ? <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                              : member.full_name?.slice(0,2).toUpperCase()}
                          </div>
                          <p className="font-semibold text-gray-900 text-sm">{member.full_name}</p>
                        </div>
                        {/* Load indicator */}
                        {loadPct > 0 && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{loadPct}% late</span>
                        )}
                      </div>
                      {/* 4 stats */}
                      <div className="grid grid-cols-2">
                        {[
                          { label: 'Content Today',  value: member.contentToday,   warn: false, icon: '📅' },
                          { label: 'Tasks Today',    value: member.tasksToday,     warn: false, icon: '✅' },
                          { label: 'Late Content',   value: member.overdueContent, warn: member.overdueContent > 0, icon: '⚠️' },
                          { label: 'Late Tasks',     value: member.overdueTasks,   warn: member.overdueTasks > 0, icon: '🔴' },
                        ].map(({ label, value, warn, icon }, i) => (
                          <div key={label} className={`px-5 py-4 ${i % 2 === 0 ? 'border-r border-white/50' : ''} ${i < 2 ? 'border-b border-white/50' : ''} ${warn ? 'bg-red-50/40' : ''}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${warn ? 'text-red-400' : 'text-gray-400'}`}>{label}</p>
                            <p className={`text-3xl font-bold ${warn ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                      {/* Workload bar */}
                      {totalTasks > 0 && (
                        <div className="px-5 py-3 border-t border-white/50">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Workload</p>
                            <p className="text-[10px] text-gray-400">{totalTasks} tasks</p>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-800 rounded-full" style={{ width: `${Math.min(100, (totalTasks / 20) * 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY ──────────────────────────────────────────────────────── */}
        {activeTab === 'activity' && (() => {
          const now = new Date()
          const todayStr = now.toISOString().split('T')[0]
          const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0]

          const groups: { label: string; items: typeof activity }[] = [
            { label: 'Today',     items: activity.filter(l => l.createdAt.startsWith(todayStr)) },
            { label: 'Yesterday', items: activity.filter(l => l.createdAt.startsWith(yesterdayStr)) },
            { label: 'Earlier',   items: activity.filter(l => !l.createdAt.startsWith(todayStr) && !l.createdAt.startsWith(yesterdayStr)) },
          ].filter(g => g.items.length > 0)

          return (
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/40">
                <div>
                  <h2 className="font-semibold text-gray-900">Activity</h2>
                  <p className="text-xs text-gray-400 mt-0.5">All actions by you and your team</p>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{activity.length} events</span>
              </div>
              {activity.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-16">No activity yet</p>
              ) : (
                <div>
                  {groups.map(({ label, items }) => (
                    <div key={label}>
                      {/* Date group header */}
                      <div className="px-6 py-2 bg-gray-50/60 border-b border-gray-100/50">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                      </div>
                      <div className="divide-y divide-gray-100/50">
                        {items.map((log) => {
                          const verb = log.action.replace(/_/g, ' ')
                          const entityLabel = log.entityType?.replace(/_/g, ' ')
                          const initials = log.actorName.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()
                          const time = new Date(log.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                          return (
                            <div key={log.id} className="flex items-start gap-4 px-6 py-3.5 hover:bg-white/40 transition-colors">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-600 shrink-0 mt-0.5">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 leading-snug">
                                  <span className="font-semibold text-gray-900">{log.actorName}</span>
                                  {' '}<span>{verb}</span>
                                  {entityLabel && (
                                    <span className="ml-1.5 text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md uppercase tracking-wide">{entityLabel}</span>
                                  )}
                                </p>
                              </div>
                              <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">{time}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        })()}

      </div>{/* /card */}
    </div>
  )
}
