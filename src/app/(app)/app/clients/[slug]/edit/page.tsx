import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientForm from '@/components/clients/ClientForm'
import PageHeader from '@/components/shared/PageHeader'

export default async function EditClientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: allClients }] = await Promise.all([
    supabase.from('clients').select('*').eq('slug', slug).single(),
    supabase.from('clients').select('id,name,parent_client_id').order('name'),
  ])
  if (!client) notFound()

  return (
    <div className="max-w-2xl mx-auto p-6">
      <PageHeader title="Edit Client" />
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <ClientForm
          client={client}
          allClients={(allClients ?? []) as { id: string; name: string; parent_client_id: string | null }[]}
        />
      </div>
    </div>
  )
}
