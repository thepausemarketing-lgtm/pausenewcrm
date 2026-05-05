import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CAMPAIGN_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLATFORMS } from '@/lib/constants'
import { formatDate, formatCurrency } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { CheckSquare, CalendarDays } from 'lucide-react'
import type { Campaign, Task, ContentItem } from '@/types/database.types'

type CampaignWithClient = Campaign & { client?: { name: string; slug: string } | null }
type TaskWithAssignee = Task & { assignee?: { full_name: string } | null }

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawCampaign } = await supabase
    .from('campaigns')
    .select('*, client:clients(name,slug)')
    .eq('id', id)
    .single()

  const campaign = rawCampaign as CampaignWithClient | null
  if (!campaign) notFound()

  const [{ data: rawTasks }, { data: rawContentItems }] = await Promise.all([
    supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(full_name)').eq('campaign_id', id).order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('content_items').select('*').eq('campaign_id', id).order('publish_at', { ascending: true }),
  ])

  const tasks = (rawTasks ?? []) as TaskWithAssignee[]
  const contentItems = (rawContentItems ?? []) as ContentItem[]

  const status = CAMPAIGN_STATUSES.find(s => s.value === campaign.status)!
  const client = campaign.client ?? null

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-semibold text-gray-900">{campaign.name}</h2>
              <StatusBadge label={status.label} color={status.color} />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {client && <Link href={`/app/clients/${client.slug}`} className="hover:text-gray-800">{client.name}</Link>}
              <span className="capitalize">{campaign.type.replace('_', ' ')}</span>
              {campaign.start_date && (
                <span>{formatDate(campaign.start_date, 'dd/MM')} — {campaign.end_date ? formatDate(campaign.end_date, 'dd/MM') : 'ongoing'}</span>
              )}
              {campaign.budget && <span className="font-medium text-gray-700">{formatCurrency(campaign.budget)} budget</span>}
            </div>
          </div>
          <Link href={`/app/campaigns/${id}/edit`}
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
            Edit
          </Link>
        </div>
        {campaign.description && (
          <p className="mt-3 text-sm text-gray-600">{campaign.description}</p>
        )}
      </div>

      {/* Tasks */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Tasks ({tasks.length})</h3>
        {!tasks.length ? (
          <EmptyState icon={CheckSquare} title="No tasks in this campaign" />
        ) : (
          <div className="space-y-2">
            {tasks.map(task => {
              const taskStatus = TASK_STATUSES.find(s => s.value === task.status)!
              const assignee = task.assignee ?? null
              return (
                <Link key={task.id} href={`/app/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-50 hover:border-gray-100 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-400">{assignee?.full_name ?? 'Unassigned'}{task.due_date ? ` · Due ${formatDate(task.due_date, 'dd/MM')}` : ''}</p>
                  </div>
                  <StatusBadge label={taskStatus.label} color={taskStatus.color} />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Content Items */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Content ({contentItems.length})</h3>
        {!contentItems.length ? (
          <EmptyState icon={CalendarDays} title="No content in this campaign" />
        ) : (
          <div className="space-y-2">
            {contentItems.map(item => {
              const itemStatus = CONTENT_STATUSES.find(s => s.value === item.status)!
              const platform = PLATFORMS.find(p => p.value === item.platform)!
              return (
                <Link key={item.id} href={`/app/calendar/${item.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-50 hover:border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="w-2 h-6 rounded-full shrink-0" style={{ backgroundColor: platform.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">{platform.label} · {item.publish_at ? formatDate(item.publish_at, 'dd/MM') : '—'}</p>
                  </div>
                  <StatusBadge label={itemStatus.label} color={itemStatus.color} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
