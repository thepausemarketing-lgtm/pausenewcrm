import { createClient } from '@/lib/supabase/server'
import MyTasksClient from '@/components/tasks/MyTasksClient'
import type { Task } from '@/types/database.types'

export type AssigneeRef = {
  user_id: string
  assigned_at: string
  user: { id: string; full_name: string; avatar_url: string | null } | null
}
export type TaskWithAssignees = Task & {
  client?: { name: string; slug: string } | null
  task_assignees?: AssigneeRef[]
}

export default async function MyTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get task IDs where this user is a co-assignee (not primary)
  const { data: coAssigned } = await (supabase as any)
    .from('task_assignees')
    .select('task_id')
    .eq('user_id', user.id)

  const coIds: string[] = (coAssigned ?? []).map((r: any) => r.task_id)

  const orFilter = coIds.length > 0
    ? `assigned_to.eq.${user.id},id.in.(${coIds.join(',')})`
    : `assigned_to.eq.${user.id}`

  const [{ data: rawTasks }, { data: rawProfiles }, { data: rawClients }] = await Promise.all([
    (supabase as any)
      .from('tasks')
      .select('*, client:clients(name,slug), task_assignees(user_id, assigned_at, user:profiles!task_assignees_user_id_fkey(id,full_name,avatar_url))')
      .or(orFilter)
      .not('status', 'in', '(done,cancelled)')
      .is('parent_task_id', null)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name'),
    supabase.from('clients').select('id, name, parent_client_id').eq('status', 'active').order('name'),
  ])

  return (
    <MyTasksClient
      tasks={(rawTasks ?? []) as TaskWithAssignees[]}
      profiles={(rawProfiles ?? []) as { id: string; full_name: string }[]}
      clients={(rawClients ?? []) as { id: string; name: string }[]}
      currentUserId={user.id}
    />
  )
}
