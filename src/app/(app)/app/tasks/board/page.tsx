import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import PageHeader from '@/components/shared/PageHeader'
import TaskViewToggle from '@/components/tasks/TaskViewToggle'

export default async function TaskBoardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return (
    <div className="h-full flex flex-col px-3 sm:px-6 pt-3 sm:pt-6">
      <PageHeader
        title="Task Board"
        actions={<TaskViewToggle />}
      />
      <KanbanBoard currentUserId={user.id} />
    </div>
  )
}
