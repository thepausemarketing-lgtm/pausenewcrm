import { createClient } from '@/lib/supabase/server'
import AllTasksClient from '@/components/tasks/AllTasksClient'

export default async function AllTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return <AllTasksClient currentUserId={user.id} />
}
