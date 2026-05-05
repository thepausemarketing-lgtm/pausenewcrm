import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ContactsPanel from '@/components/clients/ContactsPanel'
import type { Contact } from '@/types/database.types'

export default async function ClientContactsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: clientRow } = await supabase.from('clients').select('id').eq('slug', slug).single()
  const client = clientRow as { id: string } | null
  if (!client) notFound()

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', client.id)
    .order('is_primary', { ascending: false })
    .order('full_name')

  return <ContactsPanel clientId={client.id} contacts={(contacts ?? []) as Contact[]} />
}
