import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SocialAccountsClient from '@/components/clients/SocialAccountsClient'

export default async function ClientSocialPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('id,name,slug').eq('slug', slug).single()
  if (!client) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = await (supabase as any)
    .from('client_social_accounts')
    .select('*')
    .eq('client_id', client.id)
    .order('platform')

  // Latest insights per account
  const insightsMap: Record<string, any> = {}
  for (const acc of accounts ?? []) {
    const { data: insight } = await (supabase as any)
      .from('social_insights')
      .select('metrics, fetched_at')
      .eq('social_account_id', acc.id)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single()
    if (insight) insightsMap[acc.id] = insight
  }

  return (
    <SocialAccountsClient
      client={client}
      accounts={accounts ?? []}
      insightsMap={insightsMap}
      currentUserId={user!.id}
      justConnected={sp.connected === '1'}
      connectError={sp.error}
    />
  )
}
