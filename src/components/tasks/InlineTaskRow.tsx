'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Repeat2, Flag } from 'lucide-react'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import AssigneeStack from '@/components/shared/AssigneeStack'
import type { TaskWithAssignees } from '@/app/(app)/app/tasks/page'

interface Props {
  task: TaskWithAssignees
  profiles: { id: string; full_name: string }[]
  selected: boolean
  onSelect: (checked: boolean) => void
  onOpenDrawer: (id: string) => void
  onUpdate: (updated: TaskWithAssignees) => void
  today: string
}

const STATUS_DOT: Record<string, string> = {
  todo:        'bg-gray-300',
  in_progress: 'bg-blue-500',
  in_review:   'bg-amber-400',
  done:        'bg-green-500',
  cancelled:   'bg-red-400',
}

const PRIORITY_FLAG: Record<string, string> = {
  urgent: 'text-red-500',
  high:   'text-orange-400',
  medium: 'text-yellow-400',
  low:    'text-gray-300',
}

async function patchTask(id: string, patch: Record<string, unknown>) {
  await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export default function InlineTaskRow({ task, profiles, selected, onSelect, onOpenDrawer, onUpdate, today }: Props) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(task.title)

  const isOverdue = task.due_date && task.due_date < today && !['done', 'cancelled'].includes(task.status)
  const priorityLabel = TASK_PRIORITIES.find(p => p.value === task.priority)?.label ?? task.priority

  const saveTitle = async () => {
    setEditingTitle(false)
    if (!titleVal.trim() || titleVal === task.title) return
    onUpdate({ ...task, title: titleVal })
    await patchTask(task.id, { title: titleVal })
  }

  const handleStatusChange = async (status: string) => {
    onUpdate({ ...task, status: status as TaskWithAssignees['status'] })
    await patchTask(task.id, { status })
  }

  const handlePriorityChange = async (priority: string) => {
    onUpdate({ ...task, priority: priority as TaskWithAssignees['priority'] })
    await patchTask(task.id, { priority })
  }

  const handleDueDateChange = async (due_date: string) => {
    onUpdate({ ...task, due_date: due_date || null })
    await patchTask(task.id, { due_date: due_date || null })
  }

  const handleAssigneeChange = async (assigned_to: string) => {
    onUpdate({ ...task, assigned_to })
    await patchTask(task.id, { assigned_to })
  }

  return (
    <tr className={`group border-b border-gray-100 last:border-0 transition-colors ${selected ? 'bg-violet-50/40' : 'hover:bg-gray-50/50'}`}>

      {/* Checkbox */}
      <td className="pl-4 pr-1 py-2.5 w-8" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          className="rounded border-gray-300 text-violet-600 focus:ring-violet-400"
          checked={selected}
          onChange={e => onSelect(e.target.checked)}
        />
      </td>

      {/* Title — with status circle on the left */}
      <td className="px-2 py-2.5 min-w-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {/* Status circle */}
          <div className="relative shrink-0" title="Change status">
            <span className={`block w-3 h-3 rounded-full border-2 border-white ring-1 ring-gray-200 cursor-pointer transition-transform hover:scale-125 ${STATUS_DOT[task.status] ?? 'bg-gray-300'}`} />
            <select
              value={task.status}
              onChange={e => handleStatusChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            >
              {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Title text */}
          {editingTitle ? (
            <input
              autoFocus
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
              className="text-sm font-medium text-gray-900 border-b-2 border-violet-400 outline-none bg-transparent flex-1"
            />
          ) : (
            <div className="min-w-0">
              <span
                className={`text-sm font-medium cursor-pointer inline-flex items-center gap-1.5 hover:text-violet-700 ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}
                onClick={() => onOpenDrawer(task.id)}
                onDoubleClick={() => { setEditingTitle(true); setTitleVal(task.title) }}
                title="Click to open · Double-click to rename"
              >
                {task.title}
                {task.recurrence_type && task.recurrence_type !== 'none' && (
                  <Repeat2 size={10} className="text-violet-400 shrink-0" />
                )}
              </span>
              {task.description && (
                <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{task.description}</p>
              )}
            </div>
          )}
        </div>
      </td>

      {/* Priority — flag icon only */}
      <td className="px-2 py-2.5 w-10" onClick={e => e.stopPropagation()}>
        <div className="relative inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 transition-colors cursor-pointer" title={priorityLabel}>
          <Flag size={13} className={PRIORITY_FLAG[task.priority] ?? 'text-gray-300'} fill="currentColor" />
          <select
            value={task.priority}
            onChange={e => handlePriorityChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          >
            {TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </td>

      {/* Due Date */}
      <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
        <div className="relative inline-block px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
          <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
            {task.due_date ? formatDate(task.due_date) : <span className="text-gray-300">—</span>}
            {isOverdue && <span className="ml-1">⚠</span>}
          </span>
          <input
            type="date"
            value={task.due_date ?? ''}
            onChange={e => handleDueDateChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
            title="Change due date"
          />
        </div>
      </td>

      {/* Assignee */}
      <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
        <div className="relative inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
          <AssigneeStack assignees={task.task_assignees ?? []} size="xs" />
          {!(task.task_assignees?.length) && <span className="text-xs text-gray-400">Assign</span>}
          <select
            value={task.assigned_to ?? ''}
            onChange={e => handleAssigneeChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
            title="Change assignee"
          >
            <option value="">Unassigned</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      </td>

      {/* Client */}
      <td className="px-3 py-2.5">
        {task.client ? (
          <Link href={`/app/clients/${task.client.slug}`}
            onClick={e => e.stopPropagation()}
            className="text-xs text-gray-500 hover:text-gray-800 hover:underline">
            {task.client.name}
          </Link>
        ) : <span className="text-gray-300 text-xs">—</span>}
      </td>
    </tr>
  )
}
