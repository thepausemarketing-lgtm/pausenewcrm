import { createClient } from '@/lib/supabase/server'
import { getVisibleUserIds } from '@/lib/supabase/helpers'
import MyTasksClient from '@/components/tasks/MyTasksClient'
import type { Task } from '@/types/database.types'

export type AssigneeRef = {
  user_id: string
  assigned_at: string
  user: { id: string; full_name: string; avatar_url: string | null } | null
}
export type TaskWithAssignees = Task & {
  client?: { name: string; slug: string; logo_url?: string | null } | null
  task_assignees?: AssigneeRef[]
}

export default async function MyTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Collect all user IDs visible to the current user (self + subordinates)
  const visibleIds = await getVisibleUserIds(supabase, user.id)

  // Get task IDs where any visible user is a co-assignee in task_assignees
  const { data: coAssigned } = await (supabase as any)
    .from('task_assignees')
    .select('task_id')
    .in('user_id', visibleIds ?? [user.id])

  const coIds: string[] = (coAssigned ?? []).map((r: any) => r.task_id)

  let tasksQuery = (supabase as any)
    .from('tasks')
    .select('*, client:clients(name,slug,logo_url), task_assignees(user_id, assigned_at, user:profiles!task_assignees_user_id_fkey(id,full_name,avatar_url))')
    .not('status', 'in', '(done,cancelled)')
    .is('parent_task_id', null)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (visibleIds === null) {
    // admin — no filter
  } else {
    const orParts: string[] = [
      `assigned_to.in.(${visibleIds.join(',')})`,
      ...(coIds.length > 0 ? [`id.in.(${coIds.join(',')})`] : []),
    ]
    tasksQuery = tasksQuery.or(orParts.join(','))
  }

  const [{ data: rawTasks }, { data: rawProfiles }, { data: rawClients }] = await Promise.all([
    tasksQuery,
    supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name'),
    supabase.from('clients').select('id, name, parent_client_id').not('status', 'eq', 'churned').order('name'),
  ])

  return (
    <MyTasksClient
      tasks={(rawTasks ?? []) as TaskWithAssignees[]}
      profiles={(rawProfiles ?? []) as { id: string; full_name: string }[]}
      clients={(rawClients ?? []) as { id: string; name: string; parent_client_id?: string | null }[]}
      currentUserId={user.id}
    />
  )
}
