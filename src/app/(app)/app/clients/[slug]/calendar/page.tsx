import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PLATFORMS, CONTENT_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { CalendarDays } from 'lucide-react'
import type { ContentItem } from '@/types/database.types'

export default async function ClientCalendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: clientRow } = await supabase.from('clients').select('id').eq('slug', slug).single()
  const client = clientRow as { id: string } | null
  if (!client) notFound()

  const { data: rawItems } = await supabase
    .from('content_items')
    .select('*')
    .eq('client_id', client.id)
    .order('publish_at', { ascending: true, nullsFirst: false })

  const items = (rawItems ?? []) as ContentItem[]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Content Calendar</h3>
        <Link href="/app/calendar" className="text-sm text-gray-500 hover:text-gray-800">View full calendar</Link>
      </div>
      {!items.length ? (
        <EmptyState icon={CalendarDays} title="No content items" description="Content for this client will appear here" />
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const platform = PLATFORMS.find(p => p.value === item.platform)!
            const status = CONTENT_STATUSES.find(s => s.value === item.status)!
            return (
              <Link key={item.id} href={`/app/calendar/${item.id}`}
                className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="w-2 h-6 rounded-full shrink-0" style={{ backgroundColor: platform.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{item.title}</p>
                  <p className="text-xs text-gray-400">{platform.label} · {item.content_type.replace('_', ' ')}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-xs text-gray-500">{item.publish_at ? formatDate(item.publish_at, 'dd/MM') : '—'}</p>
                  <StatusBadge label={status.label} color={status.color} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
