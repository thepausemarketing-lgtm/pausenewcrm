import { createClient } from '@/lib/supabase/server'
import MyTasksClient from '@/components/tasks/MyTasksClient'
import type { Task } from '@/types/database.types'

// Re-export types for client components that still import them from here
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

  return <MyTasksClient currentUserId={user.id} />
}
