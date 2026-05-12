import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { CAMPAIGN_STATUSES } from '@/lib/constants'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Campaign, CampaignStatus } from '@/types/database.types'

type CampaignWithClient = Campaign & { client?: { name: string; slug: string } | null }

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; client?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('campaigns')
    .select('id,name,status,type,start_date,end_date,budget,client:clients(name,slug)')
    .order('created_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status as CampaignStatus)
  if (params.client) query = query.eq('client_id', params.client)

  const [{ data: rawCampaigns }, { data: rawClients }] = await Promise.all([
    query,
    supabase.from('clients').select('id,name').eq('status', 'active').order('name'),
  ])

  const campaigns = (rawCampaigns ?? []) as CampaignWithClient[]
  const clients = (rawClients ?? []) as { id: string; name: string }[]

  return (
    <div className="max-w-7xl mx-auto p-6">
      <PageHeader
        title="Campaigns"
        description={`${campaigns.length} campaigns`}
        actions={
          <Link href="/app/campaigns/new">
            <Button size="sm" className="gap-1.5"><Plus size={14} /> New Campaign</Button>
          </Link>
        }
      />

      <form className="flex gap-3 mb-6">
        <select name="status" defaultValue={params.status ?? ''}
          className="h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white">
          <option value="">All statuses</option>
          {CAMPAIGN_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select name="client" defaultValue={params.client ?? ''}
          className="h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white">
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
      </form>

      {!campaigns.length ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create a campaign to group content and tasks under a single initiative"
          action={<Link href="/app/campaigns/new"><Button size="sm">Create Campaign</Button></Link>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Campaign</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Dates</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map(campaign => {
                const status = CAMPAIGN_STATUSES.find(s => s.value === campaign.status)!
                const client = campaign.client ?? null
                return (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/app/campaigns/${campaign.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {client ? <Link href={`/app/clients/${client.slug}`} className="text-gray-500 hover:text-gray-800">{client.name}</Link> : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge label={status.label} color={status.color} /></td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{campaign.type.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {campaign.start_date ? `${formatDate(campaign.start_date, 'dd/MM')} — ${campaign.end_date ? formatDate(campaign.end_date, 'dd/MM') : 'ongoing'}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(campaign.budget)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
