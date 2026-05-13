'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ListTodo, BarChart2, Users, Activity, TrendingUp, AlertTriangle, Clock, CheckCircle2, FileText, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types ────────────────────────────────────────────────────────────────────
interface HeroStat  { label: string; value: number; href: string; warn: boolean }
interface TaskItem  { id: string; title: string; priority: string; status: string; due_date: string | null; client: { name: string; slug: string } | null }
interface TeamMember { id: string; full_name: string; avatar_url: string | null; contentToday: number; tasksToday: number; overdueContent: number; overdueTasks: number }
interface ActivityItem { id: string; actorName: string; action: string; entityType: string | null; entityId: string | null; entityName: string | null; createdAt: string }
interface TaskPriority { value: string; label: string; color: string }

interface Props {
  greeting: string; firstName: string; todayLabel: string
  heroStats: HeroStat[]; tasks: TaskItem[]
  team: TeamMember[]; activity: ActivityItem[]
  taskPriorities: TaskPriority[]
  clients: { id: string; name: string }[]
}

const TABS = [
  { id: 'tasks',    label: 'My Tasks',        icon: ListTodo  },
  { id: 'pipeline', label: 'Content Pipeline', icon: BarChart2 },
  { id: 'team',     label: 'Team Overview',    icon: Users     },
  { id: 'activity', label: 'Activity',         icon: Activity  },
]

// ── Overall status derivation (mirrors InlineContentRow logic) ────────────────
function deriveOverallStatus(item: {
  design_status:   string | null
  internal_review: string | null
  client_approval: string | null
  live_links:      Record<string, string> | null
}): string {
  const ds = item.design_status   ?? 'not_started'
  const ir = item.internal_review ?? 'pending'
  const ca = item.client_approval ?? 'pending'
  const hasLive = Object.values(item.live_links ?? {}).some(v => !!v)
  if (hasLive)                               return 'Posted'
  if (ir === 'approved' && ca === 'approved') return 'Ready to Post'
  if (ca === 'changes_required')             return 'Client Revisions'
  if (ir === 'changes_required')             return 'Internal Revisions'
  if (ir === 'approved' && ca === 'pending') return 'Awaiting Client'
  if (ds === 'done'     && ir === 'pending') return 'Awaiting Review'
  if (ds === 'in_progress')                  return 'In Design'
  return 'Not Started'
}

// ── Pipeline stage config ─────────────────────────────────────────────────────
const STAGES = [
  { key: 'Not Started',        label: 'Not Started',        numColor: 'text-gray-600',   dotColor: 'bg-gray-400'   },
  { key: 'In Design',          label: 'In Design',          numColor: 'text-cyan-700',   dotColor: 'bg-cyan-500'   },
  { key: 'Awaiting Review',    label: 'Awaiting Review',    numColor: 'text-violet-700', dotColor: 'bg-violet-500' },
  { key: 'Awaiting Client',    label: 'Awaiting Client',    numColor: 'text-purple-700', dotColor: 'bg-purple-500' },
  { key: 'Client Revisions',   label: 'Client Revisions',   numColor: 'text-amber-700',  dotColor: 'bg-amber-500'  },
  { key: 'Internal Revisions', label: 'Internal Revisions', numColor: 'text-orange-700', dotColor: 'bg-orange-500' },
  { key: 'Ready to Post',      label: 'Ready to Post',      numColor: 'text-blue-700',   dotColor: 'bg-blue-500'   },
  { key: 'Posted',             label: 'Posted',             numColor: 'text-green-700',  dotColor: 'bg-green-500'  },
] as const

// ── PipelinePanel ─────────────────────────────────────────────────────────────
function PipelinePanel({ clients }: { clients: { id: string; name: string }[] }) {
  const today     = new Date().toISOString().split('T')[0]
  const mtdStart  = today.slice(0, 8) + '01'   // e.g. 2026-05-01

  const [dateFrom,  setDateFrom]  = useState(mtdStart)
  const [dateTo,    setDateTo]    = useState(today)
  const [clientId,  setClientId]  = useState('')
  const [counts,    setCounts]    = useState<Record<string, number>>({})
  const [loading,   setLoading]   = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      let q = (supabase as any)
        .from('content_items')
        .select('design_status, internal_review, client_approval, live_links')
        .not('status', 'eq', 'cancelled')
        .gte('publish_at', dateFrom)
        .lte('publish_at', dateTo + 'T23:59:59')

      if (clientId) q = q.eq('client_id', clientId)

      const { data } = await q
      const c: Record<string, number> = {}
      for (const row of (data ?? [])) {
        const key = deriveOverallStatus(row)
        c[key] = (c[key] ?? 0) + 1
      }
      setCounts(c)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, clientId])

  const total    = Object.values(counts).reduce((s, n) => s + n, 0)
  const notStarted = counts['Not Started'] ?? 0
  const posted     = counts['Posted']      ?? 0

  const sel = 'h-8 px-2.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400'

  return (
    <div className="p-3 sm:p-5 space-y-4">

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0">Filter</label>

        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className={sel} />
        <span className="text-xs text-gray-400">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className={sel} />

        <select value={clientId} onChange={e => setClientId(e.target.value)} className={`${sel} min-w-[140px]`}>
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <button
          onClick={() => { setDateFrom(mtdStart); setDateTo(today); setClientId('') }}
          className="text-[10px] font-semibold text-violet-500 hover:text-violet-700 underline underline-offset-2"
        >
          Reset to MTD
        </button>
      </div>

      {/* ── 3 hero stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Content', value: total,      icon: FileText,    color: 'bg-gray-50 text-gray-500'    },
          { label: 'Not Started',   value: notStarted, icon: Clock,       color: 'bg-amber-50 text-amber-500'  },
          { label: 'Posted',        value: posted,     icon: CheckCheck,  color: 'bg-green-50 text-green-600'  },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/60 rounded-xl border border-white/70 p-4 sm:p-5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} mb-3`}>
              <Icon size={15} />
            </div>
            <p className={`text-4xl sm:text-5xl font-bold leading-none mb-1 ${loading ? 'opacity-30' : ''} text-gray-900`}>
              {value}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Stage breakdown cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {STAGES.map(({ key, label, numColor, dotColor }) => {
          const count = counts[key] ?? 0
          const pct   = total ? Math.round((count / total) * 100) : 0
          return (
            <div key={key} className="bg-white/60 rounded-xl border border-white/70 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 leading-tight">{label}</p>
              </div>
              <p className={`text-3xl sm:text-4xl font-bold ${numColor} leading-none mb-1 ${loading ? 'opacity-30' : ''}`}>{count}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-gray-400">items</p>
                <p className={`text-[10px] font-bold ${numColor}`}>{pct}%</p>
              </div>
              <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${dotColor} rounded-full`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Distribution bar ────────────────────────────────────────────────── */}
      <div className="bg-white/60 rounded-xl border border-white/70 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Pipeline Distribution</p>
          <p className="text-xs text-gray-400">{total} total items</p>
        </div>
        <div className="flex rounded-full overflow-hidden h-3 mb-3 gap-0.5">
          {STAGES.map(({ key, dotColor }) => {
            const pct = total ? ((counts[key] ?? 0) / total) * 100 : 0
            return pct > 0 ? <div key={key} className={`h-full ${dotColor}`} style={{ width: `${pct}%` }} /> : null
          })}
        </div>
        <div className="flex gap-4 flex-wrap">
          {STAGES.map(({ key, label, dotColor }) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-xs font-bold text-gray-800">{counts[key] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

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

function StatChip({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
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
  tasks, team, activity,
  taskPriorities, clients,
}: Props) {
  const [activeTab, setActiveTab] = useState('tasks')

  // Derived task stats
  const today = new Date().toISOString().split('T')[0]
  const overdueCount   = tasks.filter(t => t.due_date && t.due_date < today).length
  const dueTodayCount  = tasks.filter(t => t.due_date === today).length
  const highPrioCount  = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length
  const doneCount      = tasks.filter(t => t.status === 'done').length

  return (
    <div className="px-3 sm:px-6 pb-6 min-h-full">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Your workspace</p>
          <h1 className="text-3xl sm:text-[2.4rem] font-bold text-gray-900 tracking-tight leading-tight">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-sm text-gray-400 mt-1">{todayLabel}</p>
        </div>
        {/* Hero KPIs — 2×2 grid on mobile, row on sm+ */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-4 sm:gap-10">
          {heroStats.map(({ label, value, href, warn }) => (
            <Link key={label} href={href} className="group text-center">
              <div className="flex items-center justify-center gap-1.5">
                <p className={`text-[2rem] sm:text-[2.8rem] font-bold tabular-nums leading-none tracking-tight group-hover:opacity-70 transition-opacity ${warn && value > 0 ? 'text-red-500' : 'text-gray-900'}`}>
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
      <div className="flex justify-start sm:justify-center items-end gap-0.5 sm:gap-1 relative z-10 overflow-x-auto pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
              activeTab === id
                ? 'tab-active-shape bg-[rgb(243,245,249)] border-t border-l border-r border-white/70 shadow-[0_-2px_16px_rgba(0,0,0,0.07)] px-4 sm:px-6 py-3 sm:py-3.5 -mb-px text-gray-900 font-semibold relative z-10'
                : 'px-3 sm:px-5 py-2 sm:py-2.5 text-gray-400 hover:text-gray-700 hover:bg-white/30 rounded-xl'
            }`}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Main card ────────────────────────────────────────────────────────── */}
      <div className={`${card} border-t-0 p-0 overflow-hidden relative z-0`}>

        {/* ── MY TASKS ──────────────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <>
            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 sm:p-4 border-b border-white/50">
              <StatChip icon={AlertTriangle} label="Overdue"      value={overdueCount}  color="bg-red-50 text-red-500" />
              <StatChip icon={Clock}         label="Due today"    value={dueTodayCount}  color="bg-amber-50 text-amber-500" />
              <StatChip icon={TrendingUp}    label="High priority" value={highPrioCount} color="bg-orange-50 text-orange-500" />
              <StatChip icon={CheckCircle2}  label="Total pending" value={tasks.length}  color="bg-blue-50 text-blue-500" />
            </div>

            {tasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">No pending tasks 🎉</p>
            ) : (
              <>
                <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-gray-100/60">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">All pending tasks</p>
                  <Link href="/app/tasks" className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">View all →</Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <thead>
                      <tr className="border-b border-gray-100/50">
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 sm:px-6 py-2.5">Task</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 sm:px-4 py-2.5 w-24 sm:w-28">Priority</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 sm:px-4 py-2.5 w-28 sm:w-36">Due</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 sm:px-4 py-2.5 w-28 sm:w-36 hidden sm:table-cell">Client</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => {
                        const prio = taskPriorities.find(p => p.value === task.priority)
                        const isOverdue = task.due_date && task.due_date < today
                        return (
                          <tr key={task.id} className="border-b border-gray-50/80 last:border-0 hover:bg-white/50 transition-colors group">
                            <td className="px-3 sm:px-6 py-3">
                              <Link href={`/app/tasks/${task.id}`} className="flex items-center gap-2 sm:gap-3">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: prio?.color ?? '#ccc' }} />
                                <span className={`text-sm font-medium group-hover:text-gray-900 transition-colors ${isOverdue ? 'text-gray-700' : 'text-gray-700'}`}>{task.title}</span>
                              </Link>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-md" style={{ color: prio?.color ?? '#999', backgroundColor: `${prio?.color ?? '#ccc'}18` }}>
                                {task.priority ?? '—'}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <span className={`text-xs font-medium ${dueDateColor(task.due_date)}`}>{dueDateLabel(task.due_date)}</span>
                            </td>
                            <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                              {task.client
                                ? <Link href={`/app/clients/${task.client.slug}`} className="text-xs text-gray-500 hover:text-gray-800 font-medium">{task.client.name}</Link>
                                : <span className="text-xs text-gray-300">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── CONTENT PIPELINE ──────────────────────────────────────────────── */}
        {activeTab === 'pipeline' && <PipelinePanel clients={clients} />}

        {/* ── TEAM OVERVIEW ─────────────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="p-3 sm:p-5">
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
              <div className="flex items-center justify-between px-3 sm:px-6 py-4 border-b border-white/40">
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
                            <div key={log.id} className="flex items-start gap-3 sm:gap-4 px-3 sm:px-6 py-3 sm:py-3.5 hover:bg-white/40 transition-colors">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-600 shrink-0 mt-0.5">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 leading-snug">
                                  <span className="font-semibold text-gray-900">{log.actorName}</span>
                                  {' '}<span>{verb}</span>
                                  {log.entityName && (
                                    <span className="font-semibold text-gray-900"> "{log.entityName}"</span>
                                  )}
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
