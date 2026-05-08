'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, List, CalendarDays, Calendar, Clock, AlertCircle, Download, CheckCircle2, X, Trash2 } from 'lucide-react'
import InlineTaskRow from './InlineTaskRow'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import PageHeader from '@/components/shared/PageHeader'
import NewTaskModal from './NewTaskModal'
import TaskDetailDrawer from './TaskDetailDrawer'
import AssigneeStack from '@/components/shared/AssigneeStack'
import TaskViewToggle from './TaskViewToggle'
import type { TaskWithAssignees } from '@/app/(app)/app/tasks/page'

type DateFilter = 'all' | 'today' | 'tomorrow' | 'overdue' | 'custom'

interface Props {
  tasks: TaskWithAssignees[]
  profiles: { id: string; full_name: string }[]
  clients: { id: string; name: string }[]
  currentUserId: string
}

// Use local date (not UTC) so Today/Tomorrow match the user's timezone
function toDateStr(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

const DATE_TABS: { key: DateFilter; label: string; icon: React.ElementType }[] = [
  { key: 'all',      label: 'All',      icon: List },
  { key: 'today',    label: 'Today',    icon: Calendar },
  { key: 'tomorrow', label: 'Tomorrow', icon: CalendarDays },
  { key: 'overdue',  label: 'Overdue',  icon: AlertCircle },
  { key: 'custom',   label: 'Custom',   icon: Clock },
]

export default function MyTasksClient({ tasks: initialTasks, profiles, clients, currentUserId }: Props) {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>(initialTasks)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const today = toDateStr(new Date())
  const tomorrow = toDateStr(new Date(Date.now() + 86400000))

  const handleTaskCreated = (task: TaskWithAssignees) => {
    setTasks(prev => [task, ...prev])
    setNewTaskOpen(false)
    toast.success('Task created')
  }

  const handleTaskUpdated = (updated: TaskWithAssignees) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
    setSelectedTaskId(null)
    toast.success('Task updated')
  }

  const handleTaskDeleted = (id: string) => {
    const deletedTask = tasks.find(t => t.id === id)
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelectedTaskId(null)
    toast('Task deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          if (deletedTask) setTasks(prev => [deletedTask, ...prev])
        },
      },
      duration: 5000,
    })
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    setTasks(prev => prev.filter(t => !selectedIds.has(t.id)))
    setSelectedIds(new Set())
    toast.success(`${ids.length} task${ids.length !== 1 ? 's' : ''} deleted`)
    await Promise.all(ids.map(id =>
      fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    ))
  }

  const handleBulkStatusChange = async (status: string) => {
    const ids = Array.from(selectedIds)
    setTasks(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, status: status as any } : t))
    setSelectedIds(new Set())
    toast.success(`${ids.length} task${ids.length !== 1 ? 's' : ''} updated`)
    await Promise.all(ids.map(id =>
      fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    ))
  }

  const handleBulkPriorityChange = async (priority: string) => {
    const ids = Array.from(selectedIds)
    setTasks(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, priority: priority as any } : t))
    setSelectedIds(new Set())
    toast.success(`Priority updated for ${ids.length} task${ids.length !== 1 ? 's' : ''}`)
    await Promise.all(ids.map(id =>
      fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priority }) })
    ))
  }

  const saveInlineEdit = async (id: string) => {
    if (!editingTitle.trim()) { setEditingId(null); return }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title: editingTitle } : t))
    setEditingId(null)
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editingTitle })
    })
  }

  const dateFiltered = useMemo(() => {
    switch (dateFilter) {
      case 'today':
        return tasks.filter(t => t.due_date === today)
      case 'tomorrow':
        return tasks.filter(t => t.due_date === tomorrow)
      case 'overdue':
        return tasks.filter(t => t.due_date && t.due_date < today)
      case 'custom':
        return tasks.filter(t => {
          if (!t.due_date) return false
          if (customFrom && t.due_date < customFrom) return false
          if (customTo && t.due_date > customTo) return false
          return true
        })
      default:
        return tasks
    }
  }, [tasks, dateFilter, today, tomorrow, customFrom, customTo])

  const filtered = useMemo(() =>
    assigneeFilter
      ? dateFiltered.filter(t => t.task_assignees?.some(a => a.user_id === assigneeFilter))
      : dateFiltered
  , [dateFiltered, assigneeFilter])

  const downloadCSV = () => {
    const headers = ['Title', 'Priority', 'Status', 'Due Date', 'Client']
    const rows = filtered.map(t => {
      const priority = TASK_PRIORITIES.find(p => p.value === t.priority)
      const status = TASK_STATUSES.find(s => s.value === t.status)
      return [t.title, priority?.label ?? t.priority, status?.label ?? t.status, t.due_date ?? '', t.client?.name ?? '']
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'my-tasks.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const counts: Record<DateFilter, number> = {
    all: tasks.length,
    today: tasks.filter(t => t.due_date === today).length,
    tomorrow: tasks.filter(t => t.due_date === tomorrow).length,
    overdue: tasks.filter(t => t.due_date && t.due_date < today).length,
    custom: dateFilter === 'custom' ? filtered.length : 0,
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <PageHeader
        title="My Tasks"
        description="Tasks assigned to you"
        actions={
          <div className="flex items-center gap-3">
            <TaskViewToggle />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadCSV}>
                <Download size={14} /> Export
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setNewTaskOpen(true)}>
                <Plus size={14} /> New Task
              </Button>
            </div>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {DATE_TABS.map(({ key, label, icon: Icon }) => {
          const active = dateFilter === key
          const count = counts[key]
          return (
            <button
              key={key}
              onClick={() => setDateFilter(key)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border"
              style={
                active
                  ? { backgroundColor: '#ede9fe', borderColor: '#7c3aed', color: '#6d28d9' }
                  : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#6b7280' }
              }
            >
              <Icon size={13} />
              {label}
              {count > 0 && (
                <span
                  className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none"
                  style={
                    active
                      ? { backgroundColor: '#7c3aed', color: 'white' }
                      : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                  }
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400" />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400" />
          </div>
        )}

        {/* Assignee filter */}
        <div className="ml-auto">
          <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}
            className="h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none">
            <option value="">All assignees</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      </div>

      {/* Task table */}
      {filtered.length === 0 ? (
        <div className="py-8">
          <EmptyState
            icon={CalendarDays}
            title={
              dateFilter === 'all' ? "You're all caught up" :
              dateFilter === 'today' ? 'Nothing due today' :
              dateFilter === 'tomorrow' ? 'Nothing due tomorrow' :
              dateFilter === 'overdue' ? 'No overdue tasks 🎉' :
              'No tasks in this date range'
            }
            description={
              dateFilter === 'all' ? 'No pending tasks — create one to get started' : 'Try a different filter'
            }
            action={
              dateFilter === 'all' ? (
                <Button size="sm" onClick={() => setNewTaskOpen(true)}>+ New Task</Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-400"
                    checked={filtered.length > 0 && filtered.every(t => selectedIds.has(t.id))}
                    onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(t => t.id)) : new Set())}
                  />
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Task</th>
                <th className="text-left px-2 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-2 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Priority</th>
                <th className="text-left px-2 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Due</th>
                <th className="text-left px-2 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Assignees</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Client</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => (
                <InlineTaskRow
                  key={task.id}
                  task={task}
                  profiles={profiles}
                  selected={selectedIds.has(task.id)}
                  onSelect={checked => {
                    const next = new Set(selectedIds)
                    if (checked) next.add(task.id); else next.delete(task.id)
                    setSelectedIds(next)
                  }}
                  onOpenDrawer={id => setSelectedTaskId(id)}
                  onUpdate={updated => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
                  today={today}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-xl px-4 py-3 flex items-center gap-4 shadow-2xl">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-white/20" />
          <button onClick={() => handleBulkStatusChange('done')} className="flex items-center gap-1.5 text-sm hover:text-green-400 transition-colors">
            <CheckCircle2 size={14} /> Mark Done
          </button>
          <select onChange={e => { if (e.target.value) { handleBulkPriorityChange(e.target.value); e.target.value = '' } }}
            className="bg-transparent text-sm border border-white/20 rounded px-2 py-0.5 outline-none cursor-pointer">
            <option value="">Set Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div className="w-px h-4 bg-white/20" />
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 text-sm hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
          <div className="w-px h-4 bg-white/20" />
          <button onClick={() => setSelectedIds(new Set())} className="text-white/60 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {newTaskOpen && (
        <NewTaskModal
          defaultStatus="todo"
          clients={clients}
          profiles={profiles}
          currentUserId={currentUserId}
          onCreated={task => handleTaskCreated(task as TaskWithAssignees)}
          onClose={() => setNewTaskOpen(false)}
        />
      )}

      {selectedTaskId && (
        <TaskDetailDrawer
          taskId={selectedTaskId}
          clients={clients}
          profiles={profiles}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={t => handleTaskUpdated(t as TaskWithAssignees)}
          onDelete={handleTaskDeleted}
        />
      )}
    </div>
  )
}
