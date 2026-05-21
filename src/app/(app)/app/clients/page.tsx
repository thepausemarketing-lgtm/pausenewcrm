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

  const { data: { user } } = await supabase.auth.getUser()
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = myProfile?.role === 'admin'

  let query = supabase.from('clients').select('id,name,slug,status,industry,monthly_value,currency,health_score,website,parent_client_id,logo_url').order('name')

  if (params.status) query = query.eq('status', params.status as ClientStatus)
  if (params.search) query = query.ilike('name', `%${params.search}%`)

  const { data: rawClients } = await query
  const allClients = (rawClients ?? []) as Client[]

  const parents = allClients.filter(c => !c.parent_client_id)
  const brands = allClients.filter(c => c.parent_client_id)

  // Each row is either: a non-clickable group header, a clickable client, or a clickable sub-brand
  type GroupedRow =
    | { type: 'header'; client: Client }        // non-clickable parent label
    | { type: 'client'; client: Client; indent: number } // clickable

  const grouped: GroupedRow[] = []
  for (const parent of parents) {
    const children = brands.filter(b => b.parent_client_id === parent.id)
    // Always show header, then parent + children as clickable below
    grouped.push({ type: 'header', client: parent })
    grouped.push({ type: 'client', client: parent, indent: 1 })
    for (const child of children) {
      grouped.push({ type: 'client', client: child, indent: 1 })
    }
  }
  // Orphaned brands (parent filtered out)
  for (const brand of brands) {
    if (!parents.find(p => p.id === brand.parent_client_id)) {
      grouped.push({ type: 'client', client: brand, indent: 1 })
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6">
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
      <form className="flex flex-wrap gap-2 sm:gap-3 mb-6">
        <input
          name="search"
          defaultValue={params.search}
          placeholder="Search clients…"
          className="flex-1 min-w-[140px] max-w-xs h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Client / Brand</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Industry</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Retainer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grouped.map((row, i) => {
                  if (row.type === 'header') {
                    return (
                      <tr key={`header-${row.client.id}`} className="bg-gray-50">
                        <td colSpan={5} className="px-4 py-2">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{row.client.name}</span>
                        </td>
                      </tr>
                    )
                  }
                  const { client, indent } = row
                  return (
                    <tr key={`${client.id}-${i}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-2 ${indent > 0 ? 'pl-5' : ''}`}>
                          {indent > 0 && <ChevronRight size={12} className="text-gray-300 shrink-0" />}
                          {/* Logo */}
                          <div className="w-7 h-7 rounded-md border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {(client as any).logo_url
                              ? <img src={(client as any).logo_url} alt="" className="w-full h-full object-contain p-0.5" />
                              : <span className="text-xs font-bold text-gray-300">{client.name.charAt(0)}</span>
                            }
                          </div>
                          <div>
                            <Link href={`/app/clients/${client.slug}`} className="font-medium text-gray-900 hover:text-violet-600">
                              {client.name}
                            </Link>
                            {client.website && indent === 0 && (
                              <p className="text-xs text-gray-400 truncate max-w-[160px] sm:max-w-[200px]">{client.website.replace(/^https?:\/\//, '')}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><ClientStatusBadge status={client.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{client.industry ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700 hidden sm:table-cell">
                        {isAdmin ? (
                          <>
                            {formatCurrency(client.monthly_value, client.currency)}
                            {client.monthly_value && <span className="text-xs text-gray-400 ml-1">{client.currency}</span>}
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {client.health_score ? (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div key={i} className={`w-1.5 h-3 rounded-sm ${i <= client.health_score! ? 'bg-green-400' : 'bg-gray-100'}`} />
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
