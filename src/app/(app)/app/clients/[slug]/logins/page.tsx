import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientCredentials from '@/components/clients/ClientCredentials'
import { KeyRound } from 'lucide-react'

export default async function ClientLoginsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('id').eq('slug', slug).single()
  if (!client) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role, can_view_credentials').eq('id', user!.id).single()

  const isAdmin = profile?.role === 'admin'
  const canView = isAdmin || profile?.can_view_credentials === true
  const canEdit = isAdmin || profile?.role === 'manager'

  if (!canView) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
        <KeyRound size={28} className="text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">Access restricted</p>
        <p className="text-xs text-gray-400 mt-1">You don&apos;t have permission to view client credentials.</p>
        <p className="text-xs text-gray-400 mt-0.5">Ask an Admin to enable this for your account.</p>
      </div>
    )
  }

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
