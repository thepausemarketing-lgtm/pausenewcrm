import { createClient } from '@/lib/supabase/server'
import ReportsClient from '@/components/reports/ReportsClient'

export default async function ClientReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: clients } = await supabase.from('clients').select('id,name').order('name')

  const from = params.from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const to = params.to ?? new Date().toISOString().split('T')[0]

  let tasksQuery = supabase
    .from('tasks')
    .select('id,status,created_at,due_date,category')
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59')

  let contentQuery = supabase
    .from('content_items')
    .select('id,platform,status,publish_at')
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59')

  if (params.client) {
    tasksQuery = tasksQuery.eq('client_id', params.client)
    contentQuery = contentQuery.eq('client_id', params.client)
  }

  const [{ data: tasks }, { data: content }, { data: profiles }] = await Promise.all([
    tasksQuery,
    contentQuery,
    supabase.from('profiles').select('id,full_name,role').eq('is_active', true).order('full_name'),
  ])

  return (
    <ReportsClient
      clients={clients ?? []}
      tasks={tasks ?? []}
      content={content ?? []}
      profiles={profiles ?? []}
      selectedClient={params.client}
      from={from}
      to={to}
    />
  )
}
