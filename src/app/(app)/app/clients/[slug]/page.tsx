import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'

export default async function ClientOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('*').eq('slug', slug).single()
  if (!client) notFound()

  const [tasksRes, contentRes] = await Promise.all([
    supabase.from('tasks').select('id, status').eq('client_id', client.id),
    supabase.from('content_items').select('id, status').eq('client_id', client.id),
  ])

  const tasks = tasksRes.data ?? []
  const content = contentRes.data ?? []
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const publishedContent = content.filter(c => c.status === 'published').length

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length },
          { label: 'Completed Tasks', value: completedTasks },
          { label: 'Content Items', value: content.length },
          { label: 'Published', value: publishedContent },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Client details */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {[
            { label: 'Billing Type', value: client.billing_type },
            { label: 'Industry', value: client.industry },
            { label: 'Website', value: client.website },
            { label: 'Created', value: formatDate(client.created_at) },
          ].map(({ label, value }) => value ? (
            <div key={label}>
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-900 capitalize">{value}</dd>
            </div>
          ) : null)}
        </dl>
      </div>
    </div>
  )
}
