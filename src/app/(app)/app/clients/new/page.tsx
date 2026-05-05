import { createClient } from '@/lib/supabase/server'
import ClientForm from '@/components/clients/ClientForm'
import PageHeader from '@/components/shared/PageHeader'

export default async function NewClientPage() {
  const supabase = await createClient()
  const { data: allClients } = await supabase.from('clients').select('id,name,parent_client_id').order('name')

  return (
    <div className="max-w-2xl mx-auto p-6">
      <PageHeader title="New Client" description="Add a new client or brand to your workspace" />
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <ClientForm allClients={(allClients ?? []) as { id: string; name: string; parent_client_id: string | null }[]} />
      </div>
    </div>
  )
}
