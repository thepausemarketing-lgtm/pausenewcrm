import { createClient } from '@/lib/supabase/server'
import AllRenewalsClient from '@/components/clients/AllRenewalsClient'
import type { ServiceRenewal } from '@/components/clients/ClientRenewals'

export default async function AllRenewalsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: renewals }, { data: clients }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    (supabase as any).from('service_renewals').select('*, client:clients(id, name, slug)').order('renewal_date', { ascending: true }),
    supabase.from('clients').select('id, name').order('name'),
  ])
  const canEdit = profile?.role === 'admin' || profile?.role === 'manager'

  return (
    <AllRenewalsClient
      renewals={(renewals ?? []) as (ServiceRenewal & { client: { id: string; name: string; slug: string } | null })[]}
      clients={clients ?? []}
      canEdit={canEdit}
    />
  )
}
