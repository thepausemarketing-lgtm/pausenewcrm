import { createClient } from '@/lib/supabase/server'
import { getVisibleUserIds } from '@/lib/supabase/helpers'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import PageHeader from '@/components/shared/PageHeader'
import TaskViewToggle from '@/components/tasks/TaskViewToggle'

export default async function TaskBoardPage() {
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

  return (
    <div className="h-full flex flex-col px-6 pt-6">
      <PageHeader
        title="Task Board"
        actions={<TaskViewToggle />}
      />
      <KanbanBoard
        initialTasks={tasks ?? []}
        clients={clients ?? []}
        profiles={profiles ?? []}
        currentUserId={user.id}
      />
    </div>
  )
}
