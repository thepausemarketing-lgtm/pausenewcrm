import { createClient } from '@/lib/supabase/server'
import AllTasksClient from '@/components/tasks/AllTasksClient'
import type { TaskWithAssignees } from '../page'

export default async function AllTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: rawTasks }, { data: rawProfiles }, { data: rawClients }] = await Promise.all([
    (supabase as any)
      .from('tasks')
      .select('*, client:clients(name,slug), task_assignees(user_id, assigned_at, user:profiles!task_assignees_user_id_fkey(id,full_name,avatar_url))')
      .is('parent_task_id', null)
      .not('status', 'in', '(done,cancelled)')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(200),
    supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name'),
    supabase.from('clients').select('id, name, parent_client_id').eq('status', 'active').order('name'),
  ])

  return (
    <AllTasksClient
      tasks={(rawTasks ?? []) as TaskWithAssignees[]}
      profiles={(rawProfiles ?? []) as { id: string; full_name: string }[]}
      clients={(rawClients ?? []) as { id: string; name: string }[]}
      currentUserId={user.id}
    />
  )
}
