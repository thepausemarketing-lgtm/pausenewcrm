'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TASK_PRIORITIES } from '@/lib/constants'
import { dueDateLabel } from '@/lib/utils'
import type { Task } from '@/types/database.types'
import { cn } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'
import { isPast as dateFnsIsPast, parseISO } from 'date-fns'
import AssigneeStack from '@/components/shared/AssigneeStack'
import type { TaskWithAssignees } from '@/app/(app)/app/tasks/page'

type TaskWithRelations = TaskWithAssignees

interface Props {
  task: TaskWithRelations
  onClick: () => void
  isDragging?: boolean
}

export default function TaskCard({ task, onClick, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priority = TASK_PRIORITIES.find(p => p.value === task.priority)
  const isOverdue = task.due_date && task.status !== 'done' && dateFnsIsPast(parseISO(task.due_date))
  const client = task.client as { name: string } | null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg border border-gray-100 p-3 cursor-pointer hover:border-gray-200 hover:shadow-sm transition-all',
        (isDragging || isSorting) && 'opacity-50 shadow-lg rotate-1',
      )}
    >
      {/* Priority dot */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{task.title}</p>
        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: priority?.color }} />
      </div>

      {client && (
        <p className="text-xs text-gray-400 mb-2 truncate">{client.name}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-red-500' : 'text-gray-400'
            )}>
              <CalendarDays size={11} />
              {dueDateLabel(task.due_date)}
            </span>
          )}
        </div>
        {task.task_assignees && task.task_assignees.length > 0 && (
          <AssigneeStack assignees={task.task_assignees} max={3} size="xs" />
        )}
      </div>
    </div>
  )
}
