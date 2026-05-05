import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { CheckSquare } from 'lucide-react'
import type { Task } from '@/types/database.types'

type TaskWithAssignee = Task & { assignee?: { full_name: string; avatar_url: string | null } | null }

export default async function ClientTasksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('id').eq('slug', slug).single()
  if (!client) notFound()

  const { data: rawTasks } = await supabase
    .from('tasks')
    .select('*, assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url)')
    .eq('client_id', client.id)
    .is('parent_task_id', null)
    .order('due_date', { ascending: true, nullsFirst: false })
  const tasks = (rawTasks ?? []) as TaskWithAssignee[]

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">Tasks</h3>
      {!tasks.length ? (
        <EmptyState icon={CheckSquare} title="No tasks yet" description="Tasks created for this client will appear here" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Task</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Due</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map(task => {
                const priority = TASK_PRIORITIES.find(p => p.value === task.priority)!
                const status = TASK_STATUSES.find(s => s.value === task.status)!
                const assignee = task.assignee
                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/app/tasks/${task.id}`} className="font-medium text-gray-900 hover:text-blue-600">{task.title}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={priority.label} color={priority.color} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={status.label} color={status.color} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(task.due_date)}</td>
                    <td className="px-4 py-3 text-gray-500">{assignee?.full_name ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
