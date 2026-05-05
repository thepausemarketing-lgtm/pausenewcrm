import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PLATFORMS, CONTENT_STATUSES, CONTENT_TYPES } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import Link from 'next/link'
import ContentItemEditClient from '@/components/calendar/ContentItemEditClient'
import type { ContentItem } from '@/types/database.types'

type ContentItemWithJoins = ContentItem & {
  client?: { name: string; slug: string; id: string } | null
  assignee?: { full_name: string } | null
}

export default async function ContentItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawItem } = await supabase
    .from('content_items')
    .select('*, client:clients(name,slug,id), assignee:profiles!content_items_assigned_to_fkey(full_name)')
    .eq('id', id)
    .single()

  const item = rawItem as ContentItemWithJoins | null
  if (!item) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: rawProfile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const profile = rawProfile as { role: string } | null
  const { data: rawClients } = await supabase.from('clients').select('id,name').eq('status', 'active').order('name')
  const clients = (rawClients ?? []) as { id: string; name: string }[]

  const platform = PLATFORMS.find(p => p.value === item.platform)
  const status = CONTENT_STATUSES.find(s => s.value === item.status)
  const contentType = CONTENT_TYPES.find(t => t.value === item.content_type)
  const client = item.client ?? null
  const canApprove = profile?.role === 'admin' || profile?.role === 'manager'

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/app/calendar" className="text-sm text-gray-500 hover:text-gray-800">← Back to Calendar</Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-3 h-8 rounded-sm shrink-0 mt-0.5" style={{ backgroundColor: platform?.color }} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {platform?.label} · {contentType?.label}
                {client && <> · <Link href={`/app/clients/${client.slug}`} className="hover:text-gray-800">{client.name}</Link></>}
              </p>
            </div>
          </div>
          {status && <StatusBadge label={status.label} color={status.color} />}
        </div>

        {item.caption && (
          <div className="bg-gray-50 rounded-lg p-4 mb-5">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.caption}</p>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {item.publish_at && (
            <div>
              <dt className="text-gray-500">Publish Date</dt>
              <dd className="font-medium text-gray-900">{formatDateTime(item.publish_at)}</dd>
            </div>
          )}
          {item.published_at && (
            <div>
              <dt className="text-gray-500">Published At</dt>
              <dd className="font-medium text-gray-900">{formatDateTime(item.published_at)}</dd>
            </div>
          )}
        </dl>
      </div>

      <ContentItemEditClient
        item={item as Parameters<typeof ContentItemEditClient>[0]['item']}
        clients={clients}
        canApprove={canApprove}
      />
    </div>
  )
}
