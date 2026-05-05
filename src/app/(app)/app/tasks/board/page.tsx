import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import PageHeader from '@/components/shared/PageHeader'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { List } from 'lucide-react'

export default async function TaskBoardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tasks } = await (supabase as any)
    .from('tasks')
    .select('*, client:clients(name,slug), task_assignees(user_id, assigned_at, user:profiles!task_assignees_user_id_fkey(id,full_name,avatar_url))')
    .is('parent_task_id', null)
    .not('status', 'eq', 'cancelled')
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  const { data: clients } = await supabase.from('clients').select('id,name,parent_client_id').not('status', 'eq', 'churned').order('name')
  const { data: profiles } = await supabase.from('profiles').select('id,full_name').eq('is_active', true).order('full_name')

  return (
    <div className="h-full flex flex-col px-6 pt-6">
      <PageHeader
        title="Task Board"
        actions={
          <div className="flex gap-2">
            <Link href="/app/tasks"><Button variant="outline" size="sm" className="gap-1.5"><List size={14} /> List</Button></Link>
          </div>
        }
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
