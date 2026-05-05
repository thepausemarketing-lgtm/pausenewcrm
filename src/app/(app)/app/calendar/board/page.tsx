import { createClient } from '@/lib/supabase/server'
import ContentKanbanBoard from '@/components/calendar/ContentKanbanBoard'
import PageHeader from '@/components/shared/PageHeader'

export default async function ContentBoardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const canApprove = profile?.role === 'admin' || profile?.role === 'manager'

  const { data: items } = await (supabase as any)
    .from('content_items')
    .select('*, client:clients(id,name,slug), assignee:profiles!content_items_assigned_to_fkey(full_name,avatar_url)')
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false })

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .order('name')

  return (
    <div className="max-w-[1600px] mx-auto h-full flex flex-col p-6">
      <PageHeader
        title="Content Board"
        description="Drag cards to move content through the workflow"
      />
      <ContentKanbanBoard
        initialItems={items ?? []}
        clients={clients ?? []}
        canApprove={canApprove}
        currentUserId={user.id}
      />
    </div>
  )
}
