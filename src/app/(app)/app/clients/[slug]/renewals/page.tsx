import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientRenewals from '@/components/clients/ClientRenewals'
import type { ServiceRenewal } from '@/components/clients/ClientRenewals'

export default async function ClientRenewalsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('id, currency').eq('slug', slug).single()
  if (!client) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const canEdit = profile?.role === 'admin' || profile?.role === 'manager'

  const { data: renewals } = await (supabase as any)
    .from('service_renewals')
    .select('*')
    .eq('client_id', client.id)
    .order('renewal_date', { ascending: true })

  return (
    <ClientRenewals
      renewals={(renewals ?? []) as ServiceRenewal[]}
      clientId={client.id}
      clientCurrency={client.currency ?? 'INR'}
      canEdit={canEdit}
    />
  )
}
