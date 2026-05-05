import { createClient } from '@/lib/supabase/server'
import { getVisibleUserIds } from '@/lib/supabase/helpers'
import AllTasksClient from '@/components/tasks/AllTasksClient'
import type { TaskWithAssignees } from '../page'

export default async function AllTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Hierarchy-based visibility: self + all subordinates (null = admin, sees all)
  const visibleIds = await getVisibleUserIds(supabase, user.id)

  // Get task IDs where any visible user is listed in task_assignees
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
    .not('status', 'in', '(done,cancelled)')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(200)

  if (visibleIds !== null) {
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
    <AllTasksClient
      tasks={(rawTasks ?? []) as TaskWithAssignees[]}
      profiles={(rawProfiles ?? []) as { id: string; full_name: string }[]}
      clients={(rawClients ?? []) as { id: string; name: string; parent_client_id?: string | null }[]}
      currentUserId={user.id}
    />
  )
}
