'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, LayoutGrid, List, CalendarDays, Calendar, Clock, AlertCircle, Download, Repeat2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import PageHeader from '@/components/shared/PageHeader'
import NewTaskModal from './NewTaskModal'
import TaskDetailDrawer from './TaskDetailDrawer'
import AssigneeStack from '@/components/shared/AssigneeStack'
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

  const today = toDateStr(new Date())
  const tomorrow = toDateStr(new Date(Date.now() + 86400000))

  const handleTaskCreated = (task: TaskWithAssignees) => {
    setTasks(prev => [task, ...prev])
    setNewTaskOpen(false)
  }

  const handleTaskUpdated = (updated: TaskWithAssignees) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
    setSelectedTaskId(null)
  }

  const handleTaskDeleted = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelectedTaskId(null)
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
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="My Tasks"
        description="Tasks assigned to you"
        actions={
          <div className="flex gap-2">
            <Link href="/app/tasks/all"><Button variant="outline" size="sm">All Tasks</Button></Link>
            <Link href="/app/tasks/board">
              <Button variant="outline" size="sm" className="gap-1.5">
                <LayoutGrid size={14} /> Board
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadCSV}>
              <Download size={14} /> Export
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setNewTaskOpen(true)}>
              <Plus size={14} /> New Task
            </Button>
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
        <div className="flex flex-col items-center gap-4 py-8">
          <EmptyState
            icon={CalendarDays}
            title={
              dateFilter === 'all' ? 'No tasks assigned to you' :
              dateFilter === 'today' ? 'Nothing due today' :
              dateFilter === 'tomorrow' ? 'Nothing due tomorrow' :
              dateFilter === 'overdue' ? 'No overdue tasks 🎉' :
              'No tasks in this date range'
            }
            description={
              dateFilter === 'all' ? 'Create a task to get started' : 'Try a different filter'
            }
          />
          {dateFilter === 'all' && (
            <Button size="sm" className="gap-1.5" onClick={() => setNewTaskOpen(true)}>
              <Plus size={14} /> New Task
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Task</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Due</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Assignees</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(task => {
                const priority = TASK_PRIORITIES.find(p => p.value === task.priority)!
                const status = TASK_STATUSES.find(s => s.value === task.status)!
                const isOverdue = task.due_date && task.due_date < today && !['done', 'cancelled'].includes(task.status)
                return (
                  <tr key={task.id} className="hover:bg-gray-50 group cursor-pointer" onClick={() => setSelectedTaskId(task.id)}>
                    <td className="px-4 py-3">
                      <button className="font-medium text-gray-900 hover:text-violet-600 group-hover:text-violet-600 inline-flex items-center gap-1.5 text-left">
                        {task.title}
                        {task.recurrence_type && task.recurrence_type !== 'none' && (
                          <Repeat2 size={11} className="text-violet-400 shrink-0" />
                        )}
                      </button>
                      {task.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{task.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={priority.label} color={priority.color} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={status.label} color={status.color} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}>
                        {task.due_date ? formatDate(task.due_date) : '—'}
                        {isOverdue && ' ⚠'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AssigneeStack assignees={task.task_assignees ?? []} size="xs" />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {task.client ? (
                        <Link href={`/app/clients/${task.client.slug}`} className="text-gray-500 hover:text-gray-800">
                          {task.client.name}
                        </Link>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
