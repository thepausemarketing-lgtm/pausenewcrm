'use client'

import { useRouter } from 'next/navigation'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PLATFORMS, TASK_STATUSES, TASK_CATEGORIES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'

interface Props {
  clients: { id: string; name: string }[]
  tasks: { id: string; status: string; created_at: string; due_date: string | null; category: string }[]
  content: { id: string; platform: string; status: string; publish_at: string | null }[]
  profiles: { id: string; full_name: string; role: string }[]
  selectedClient?: string
  from: string
  to: string
}

export default function ReportsClient({ clients, tasks, content, profiles, selectedClient, from, to }: Props) {
  const router = useRouter()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams({ from, to, ...(selectedClient ? { client: selectedClient } : {}) })
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/app/reports/clients?${params.toString()}`)
  }

  // Content by platform
  const contentByPlatform = PLATFORMS.map(p => ({
    name: p.label,
    count: content.filter(c => c.platform === p.value).length,
    color: p.color,
  })).filter(d => d.count > 0)

  // Tasks by status
  const tasksByStatus = TASK_STATUSES.map(s => ({
    name: s.label,
    count: tasks.filter(t => t.status === s.value).length,
    color: s.color,
  })).filter(d => d.count > 0)

  // Tasks by category
  const tasksByCategory = TASK_CATEGORIES.map(c => ({
    name: c.label,
    count: tasks.filter(t => t.category === c.value).length,
  })).filter(d => d.count > 0)

  // Published content count
  const publishedContent = content.filter(c => c.status === 'published').length
  const completedTasks = tasks.filter(t => t.status === 'done').length

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Tasks', tasks.length],
      ['Completed Tasks', completedTasks],
      ['Total Content Items', content.length],
      ['Published Content', publishedContent],
      ...contentByPlatform.map(p => [`Content - ${p.name}`, p.count]),
      ...tasksByStatus.map(s => [`Tasks - ${s.name}`, s.count]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pause-crm-report-${from}-${to}.csv`
    a.click()
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      <PageHeader
        title="Reports"
        description="Analytics and performance overview"
        actions={
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1.5">
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <select value={selectedClient ?? ''} onChange={e => updateFilter('client', e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white flex-1 min-w-[140px]">
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={from} onChange={e => updateFilter('from', e.target.value)}
            className="h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={to} onChange={e => updateFilter('to', e.target.value)}
            className="h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length },
          { label: 'Completed Tasks', value: completedTasks },
          { label: 'Content Items', value: content.length },
          { label: 'Published', value: publishedContent },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content by platform */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Content by Platform</h3>
          {contentByPlatform.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No content in this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={contentByPlatform} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {contentByPlatform.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Items']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tasks by status */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Tasks by Status</h3>
          {tasksByStatus.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No tasks in this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tasksByStatus} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                  {tasksByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tasks by category */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Tasks by Category</h3>
          {tasksByCategory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No tasks in this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tasksByCategory} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                <Tooltip />
                <Bar dataKey="count" name="Tasks" fill="#6B7280" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Team Productivity */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Team Members</h3>
          <div className="space-y-2.5">
            {profiles.filter(p => p.role !== 'admin' || profiles.length < 4).map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{p.full_name}</span>
                <span className="text-xs text-gray-400 capitalize bg-gray-100 px-2 py-0.5 rounded-full">{p.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
