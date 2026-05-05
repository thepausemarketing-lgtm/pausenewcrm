'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { createClient } from '@/lib/supabase/client'
import { TASK_STATUSES } from '@/lib/constants'
import type { Task } from '@/types/database.types'
import TaskCard from './TaskCard'
import TaskDetailDrawer from './TaskDetailDrawer'
import NewTaskModal from './NewTaskModal'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type TaskWithRelations = Task & {
  client?: { name: string; slug: string } | null
  assignee?: { full_name: string; avatar_url: string | null } | null
}

interface Props {
  initialTasks: TaskWithRelations[]
  clients: { id: string; name: string }[]
  profiles: { id: string; full_name: string }[]
  currentUserId: string
}

const KANBAN_COLS = TASK_STATUSES.filter(s => s.value !== 'cancelled')

export default function KanbanBoard({ initialTasks, clients, profiles, currentUserId }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newTaskStatus, setNewTaskStatus] = useState<string | null>(null)
  const supabase = createClient()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const tasksByStatus = (status: string) => tasks.filter(t => t.status === status)

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
