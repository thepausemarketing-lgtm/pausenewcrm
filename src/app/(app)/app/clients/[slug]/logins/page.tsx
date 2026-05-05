import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientCredentials from '@/components/clients/ClientCredentials'

export default async function ClientLoginsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('id').eq('slug', slug).single()
  if (!client) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const canEdit = profile?.role === 'admin' || profile?.role === 'manager'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: credentials } = await (supabase as any)
    .from('client_credentials')
    .select('*')
    .eq('client_id', client.id)
    .order('platform')

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <ClientCredentials
        clientId={client.id}
        initialCredentials={(credentials ?? []) as Parameters<typeof ClientCredentials>[0]['initialCredentials']}
        canEdit={canEdit}
      />
    </div>
  )
}
