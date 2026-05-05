import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ActivityTimeline from '@/components/shared/ActivityTimeline'
import type { ActivityLog } from '@/types/database.types'

export default async function ClientActivityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: clientRow } = await supabase.from('clients').select('id').eq('slug', slug).single()
  const client = clientRow as { id: string } | null
  if (!client) notFound()

  const { data: rawLogs } = await supabase
    .from('activity_logs')
    .select('*, actor:profiles!activity_logs_actor_id_fkey(full_name)')
    .eq('entity_type', 'client')
    .eq('entity_id', client.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const logs = (rawLogs ?? []) as (ActivityLog & { actor?: { full_name: string } | null })[]

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">Activity</h3>
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <ActivityTimeline logs={logs} />
      </div>
    </div>
  )
}
