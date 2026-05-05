import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Users, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader'
import ClientStatusBadge from '@/components/clients/ClientStatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { formatCurrency } from '@/lib/utils'
import type { Client, ClientStatus } from '@/types/database.types'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase.from('clients').select('*').order('name')

  if (params.status) query = query.eq('status', params.status as ClientStatus)
  if (params.search) query = query.ilike('name', `%${params.search}%`)

  const { data: rawClients } = await query
  const allClients = (rawClients ?? []) as Client[]

  // Group: top-level clients first, then their brands underneath
  const parents = allClients.filter(c => !c.parent_client_id)
  const brands = allClients.filter(c => c.parent_client_id)

  // Build grouped list: parent → [brands]
  type GroupedRow = { client: Client; isBrand: boolean }
  const grouped: GroupedRow[] = []
  for (const parent of parents) {
    grouped.push({ client: parent, isBrand: false })
    const children = brands.filter(b => b.parent_client_id === parent.id)
    for (const child of children) {
      grouped.push({ client: child, isBrand: true })
    }
  }
  // Also add any brands whose parent wasn't returned (e.g. filtered out)
  for (const brand of brands) {
    if (!parents.find(p => p.id === brand.parent_client_id)) {
      grouped.push({ client: brand, isBrand: true })
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <PageHeader
        title="Clients"
        description={`${parents.length} clients · ${brands.length} brands`}
        actions={
          <Link href="/app/clients/new">
            <Button size="sm" className="gap-1.5">
              <Plus size={14} /> New Client
            </Button>
          </Link>
        }
      />

      {/* Filter bar */}
      <form className="flex gap-3 mb-6">
        <input
          name="search"
          defaultValue={params.search}
          placeholder="Search clients…"
          className="flex-1 max-w-xs h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
        />
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="prospect">Prospect</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="churned">Churned</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
      </form>

      {!grouped.length ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Create your first client to get started"
          action={<Link href="/app/clients/new"><Button size="sm">Add Client</Button></Link>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client / Brand</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Industry</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Retainer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {grouped.map(({ client, isBrand }) => (
                <tr key={client.id} className={`hover:bg-gray-50 transition-colors ${isBrand ? 'bg-gray-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <div className={isBrand ? 'pl-5 flex items-center gap-1.5' : ''}>
                      {isBrand && <ChevronRight size={12} className="text-gray-300 shrink-0" />}
                      <div>
                        <Link href={`/app/clients/${client.slug}`} className={`font-medium hover:text-violet-600 ${isBrand ? 'text-gray-600 text-xs' : 'text-gray-900'}`}>
                          {client.name}
                        </Link>
                        {client.website && !isBrand && (
                          <p className="text-xs text-gray-400 truncate max-w-[200px]">{client.website.replace(/^https?:\/\//, '')}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ClientStatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{client.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatCurrency(client.monthly_value, client.currency)}
                    {client.monthly_value && <span className="text-xs text-gray-400 ml-1">{client.currency}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {client.health_score ? (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`w-1.5 h-3 rounded-sm ${i <= client.health_score! ? 'bg-green-400' : 'bg-gray-100'}`} />
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
