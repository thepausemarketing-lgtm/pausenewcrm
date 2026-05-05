import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Plus, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CAMPAIGN_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import EmptyState from '@/components/shared/EmptyState'
import StatusBadge from '@/components/shared/StatusBadge'
import type { Campaign } from '@/types/database.types'

export default async function ClientCampaignsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: clientRow } = await supabase.from('clients').select('id').eq('slug', slug).single()
  const client = clientRow as { id: string } | null
  if (!client) notFound()

  const { data: rawCampaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  const campaigns = (rawCampaigns ?? []) as Campaign[]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Campaigns</h3>
        <Link href="/app/campaigns/new">
          <Button size="sm" variant="outline" className="gap-1.5"><Plus size={13} /> New Campaign</Button>
        </Link>
      </div>
      {!campaigns.length ? (
        <EmptyState icon={Megaphone} title="No campaigns yet" description="Create a campaign to group content and tasks" />
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => {
            const status = CAMPAIGN_STATUSES.find(s => s.value === c.status)!
            return (
              <Link key={c.id} href={`/app/campaigns/${c.id}`}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {c.type.replace('_', ' ')}
                    {c.start_date ? ` · ${formatDate(c.start_date, 'dd/MM')} — ${c.end_date ? formatDate(c.end_date, 'dd/MM') : 'ongoing'}` : ''}
                  </p>
                </div>
                <StatusBadge label={status.label} color={status.color} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
