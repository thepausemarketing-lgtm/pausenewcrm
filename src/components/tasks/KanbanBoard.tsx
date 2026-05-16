'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { createClient } from '@/lib/supabase/client'
import { getVisibleUserIds } from '@/lib/supabase/helpers'
import { TASK_STATUSES } from '@/lib/constants'
import type { Task } from '@/types/database.types'
import TaskCard from './TaskCard'
import TaskDetailDrawer from './TaskDetailDrawer'
import NewTaskModal from './NewTaskModal'
import { Plus } from 'lucide-react'

type TaskWithRelations = Task & {
  client?: { name: string; slug: string } | null
  assignee?: { full_name: string; avatar_url: string | null } | null
}

interface Props {
  currentUserId: string
}

const KANBAN_COLS = TASK_STATUSES.filter(s => s.value !== 'cancelled')

async function fetchBoardData(userId: string) {
  const supabase = createClient()
  const visibleIds = await getVisibleUserIds(supabase, userId)

  let coIds: string[] = []
  if (visibleIds !== null) {
    const { data: coAssigned } = await (supabase as any)
      .from('task_assignees')
      .select('task_id')
      .in('user_id', visibleIds)
    coIds = (coAssigned ?? []).map((r: any) => r.task_id)
  }

  let tasksQuery = (supabase as any)
    .from('tasks')
    .select('*, client:clients(name,slug), task_assignees(user_id, assigned_at, user:profiles!task_assignees_user_id_fkey(id,full_name,avatar_url))')
    .is('parent_task_id', null)
    .not('status', 'eq', 'cancelled')
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (visibleIds !== null) {
    const orParts: string[] = [
      `assigned_to.in.(${visibleIds.join(',')})`,
      ...(coIds.length > 0 ? [`id.in.(${coIds.join(',')})`] : []),
    ]
    tasksQuery = tasksQuery.or(orParts.join(','))
  }

  const [{ data: tasks }, { data: clients }, { data: profiles }] = await Promise.all([
    tasksQuery,
    supabase.from('clients').select('id,name,parent_client_id').not('status', 'eq', 'churned').order('name'),
    supabase.from('profiles').select('id,full_name').eq('is_active', true).order('full_name'),
  ])

  return {
    tasks: (tasks ?? []) as TaskWithRelations[],
    clients: (clients ?? []) as { id: string; name: string }[],
    profiles: (profiles ?? []) as { id: string; full_name: string }[],
  }
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 flex-1 animate-pulse">
      {KANBAN_COLS.map(col => (
        <div key={col.value} className="flex-shrink-0 w-72 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-gray-200" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-6 bg-gray-100 rounded-full" />
          </div>
          <div className="flex-1 space-y-2 min-h-[200px] p-2 rounded-xl bg-gray-50 border border-gray-100">
            {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-3 space-y-2 border border-gray-100">
                <div className="h-3.5 bg-gray-200 rounded w-4/5" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="h-5 w-14 bg-gray-100 rounded-full" />
                  <div className="h-5 w-14 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function KanbanBoard({ currentUserId }: Props) {
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['kanban', currentUserId],
    queryFn: () => fetchBoardData(currentUserId),
    staleTime: 2 * 60 * 1000,
  })

  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const clients = data?.clients ?? []
  const profiles = data?.profiles ?? []

  useEffect(() => {
    if (data?.tasks) setTasks(data.tasks)
  }, [data?.tasks])

  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newTaskStatus, setNewTaskStatus] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const tasksByStatus = (status: string) => tasks.filter(t => t.status === status)

  if (isLoading) return <KanbanSkeleton />

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as string

    if (!KANBAN_COLS.some(c => c.value === newStatus)) return

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t))
    await supabase.from('tasks').update({ status: newStatus as Task['status'] }).eq('id', taskId)
  }

  const handleTaskCreated = (task: TaskWithRelations) => {
    setTasks(prev => [task, ...prev])
    setNewTaskStatus(null)
  }

  const handleTaskUpdated = (updated: TaskWithRelations) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setSelectedTaskId(null)
  }

  const handleTaskDeleted = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelectedTaskId(null)
  }

  const activeTask = tasks.find(t => t.id === activeId)

  return (
    <>
      <DndContext sensors={sensors} onDragStart={e => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {KANBAN_COLS.map(col => (
            <div key={col.value} className="flex-shrink-0 w-72 flex flex-col">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-sm font-medium text-gray-700">{col.label}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {tasksByStatus(col.value).length}
                  </span>
                </div>
                <button
                  onClick={() => setNewTaskStatus(col.value)}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Tasks */}
              <SortableContext
                id={col.value}
                items={tasksByStatus(col.value).map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className="flex-1 space-y-2 min-h-[200px] p-2 rounded-xl bg-gray-50 border border-gray-100"
                  data-droppable-id={col.value}
                >
                  {tasksByStatus(col.value).map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                  {tasksByStatus(col.value).length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-gray-400">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </SortableContext>

              {/* Quick add button at bottom */}
              <button
                onClick={() => setNewTaskStatus(col.value)}
                className="mt-2 w-full flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus size={12} /> Add task
              </button>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} onClick={() => {}} isDragging />}
        </DragOverlay>
      </DndContext>

      {selectedTaskId && (
        <TaskDetailDrawer
          taskId={selectedTaskId}
          clients={clients}
          profiles={profiles}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={handleTaskUpdated}
          onDelete={handleTaskDeleted}
        />
      )}

      {newTaskStatus && (
        <NewTaskModal
          defaultStatus={newTaskStatus}
          clients={clients}
          profiles={profiles}
          currentUserId={currentUserId}
          onCreated={handleTaskCreated}
          onClose={() => setNewTaskStatus(null)}
        />
      )}
    </>
  )
}
