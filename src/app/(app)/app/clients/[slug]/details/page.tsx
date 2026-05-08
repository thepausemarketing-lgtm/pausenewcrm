import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Mail, Phone, ExternalLink, Star, Megaphone, KeyRound, RefreshCw, Share2 } from 'lucide-react'
import { CAMPAIGN_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import type { Contact, Campaign } from '@/types/database.types'

export default async function ClientDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: clientRow } = await supabase
    .from('clients')
    .select('id')
    .eq('slug', slug)
    .single()
  const client = clientRow as { id: string } | null
  if (!client) notFound()

  const basePath = `/app/clients/${slug}`

  // Fetch contacts
  const { data: rawContacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', client.id)
    .order('is_primary', { ascending: false })
    .order('full_name')
  const contacts = (rawContacts ?? []) as Contact[]

  // Fetch campaigns
  const { data: rawCampaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
  const campaigns = (rawCampaigns ?? []) as Campaign[]

  // Fetch counts for logins and renewals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: loginCount } = await (supabase as any)
    .from('client_credentials')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', client.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: renewalCount } = await (supabase as any)
    .from('service_renewals')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', client.id)

  return (
    <div className="space-y-4">

      {/* Contacts Section */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Contacts</h3>
        {contacts.length === 0 ? (
          <p className="text-sm text-gray-400">No contacts yet. <Link href={`${basePath}/contacts`} className="text-blue-500 hover:underline">Add a contact</Link>.</p>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm">{contact.full_name}</p>
                    {contact.is_primary && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        <Star size={10} className="fill-current" /> Primary
                      </span>
                    )}
                  </div>
                  {contact.title && <p className="text-xs text-gray-500 mt-0.5">{contact.title}</p>}
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                        <Mail size={11} /> {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                        <Phone size={11} /> {contact.phone}
                      </a>
                    )}
                    {contact.linkedin_url && (
                      <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                        <ExternalLink size={11} /> LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaigns Section */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Campaigns</h3>
        {campaigns.length === 0 ? (
          <p className="text-sm text-gray-400">No campaigns yet.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => {
              const status = CAMPAIGN_STATUSES.find(s => s.value === c.status)!
              return (
                <Link
                  key={c.id}
                  href={`/app/campaigns/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{c.name}</p>
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

      {/* Logins & Renewals Section */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Logins &amp; Renewals</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <Link
            href={`${basePath}/logins`}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors flex-1"
          >
            <KeyRound size={16} className="text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {loginCount ?? 0} login{loginCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-400">Manage logins</p>
            </div>
          </Link>
          <Link
            href={`${basePath}/renewals`}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors flex-1"
          >
            <RefreshCw size={16} className="text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {renewalCount ?? 0} renewal{renewalCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-400">Manage renewals</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Social Section */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Social</h3>
        <Link
          href={`${basePath}/social`}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
        >
          <Share2 size={16} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-900">Manage social accounts</p>
        </Link>
      </div>

    </div>
  )
}
