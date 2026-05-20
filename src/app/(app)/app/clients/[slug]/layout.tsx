import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, ExternalLink } from 'lucide-react'
import ClientStatusBadge from '@/components/clients/ClientStatusBadge'
import { formatCurrency } from '@/lib/utils'

const TABS = [
  { href: '', label: 'Overview' },
  { href: '/calendar', label: 'Content' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/details', label: 'Details' },
  { href: '/files', label: 'Files' },
  { href: '/activity', label: 'Activity' },
  { href: '/report', label: '📊 Report' },
]

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('id,name,slug,status,industry,website,monthly_value,currency,health_score,logo_url').eq('slug', slug).single()
  if (!client) notFound()

  const basePath = `/app/clients/${slug}`

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6">
      {/* Client Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Client logo */}
            <div className="w-10 h-10 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {client.logo_url
                ? <Image src={client.logo_url} alt={client.name} width={40} height={40} className="object-contain p-0.5" />
                : <Building2 size={18} className="text-gray-300" />
              }
            </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{client.name}</h2>
              <ClientStatusBadge status={client.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
              {client.industry && <span>{client.industry}</span>}
              {client.website && (
                <a href={client.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-gray-800 truncate max-w-[200px]">
                  {client.website.replace(/^https?:\/\//, '')} <ExternalLink size={12} className="shrink-0" />
                </a>
              )}
              {client.monthly_value && (
                <span className="font-medium text-gray-700">{formatCurrency(client.monthly_value)}/mo</span>
              )}
            </div>
          </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {client.health_score && (
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`w-2 h-4 rounded-sm ${i <= client.health_score! ? 'bg-green-400' : 'bg-gray-100'}`} />
                ))}
              </div>
            )}
            <Link href={`${basePath}/edit`}
              className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {TABS.map(({ href, label }) => (
          <Link
            key={href}
            href={`${basePath}${href}`}
            className="px-3 py-1.5 text-sm rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  )
}
