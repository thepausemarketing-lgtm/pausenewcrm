'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CAMPAIGN_STATUSES, TASK_STATUSES, CONTENT_STATUSES, PLATFORMS } from '@/lib/constants'
import { formatDate, formatCurrency } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { CheckSquare, CalendarDays, Plus, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NewTaskModal from '@/components/tasks/NewTaskModal'
import ContentItemDrawer from '@/components/calendar/ContentItemDrawer'
import type { Campaign, Task, ContentItem } from '@/types/database.types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

type CampaignWithRefs = Campaign & {
  client?: { name: string; slug: string } | null
  assignee?: { full_name: string; avatar_url: string | null } | null
}
type TaskWithAssignee = Task & { assignee?: { full_name: string } | null }

interface Props {
  campaign: CampaignWithRefs
  tasks: TaskWithAssignee[]
  contentItems: ContentItem[]
  profiles: { id: string; full_name: string }[]
  clients: { id: string; name: string; parent_client_id?: string | null }[]
  currentUserId: string
}

export default function CampaignDetailClient({
  campaign, tasks: initialTasks, contentItems: initialContent, profiles, clients, currentUserId
}: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [contentItems, setContentItems] = useState(initialContent)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newContentOpen, setNewContentOpen] = useState(false)

  const status = CAMPAIGN_STATUSES.find(s => s.value === campaign.status)!
  const client = campaign.client ?? null

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{campaign.name}</h2>
              <StatusBadge label={status.label} color={status.color} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              {client && (
                <Link href={`/app/clients/${client.slug}`} className="hover:text-gray-800 font-medium">
                  {client.name}
                </Link>
              )}
              <span className="capitalize">{campaign.type.replace('_', ' ')}</span>
              {campaign.start_date && (
                <span>
                  {formatDate(campaign.start_date, 'dd MMM')} — {campaign.end_date ? formatDate(campaign.end_date, 'dd MMM yyyy') : 'ongoing'}
                </span>
              )}
              {campaign.budget && (
                <span className="font-medium text-gray-700">{formatCurrency(campaign.budget)}</span>
              )}
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-2 mt-3">
              {campaign.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={campaign.assignee.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[9px] bg-violet-100 text-violet-700 font-semibold">
                      {getInitials(campaign.assignee.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">{campaign.assignee.full_name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <User size={13} />
                  <span>Unassigned</span>
                </div>
              )}
            </div>
          </div>

          <Link
            href={`/app/campaigns/${campaign.id}/edit`}
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors shrink-0"
          >
            Edit
          </Link>
        </div>

        {campaign.description && (
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">{campaign.description}</p>
        )}
      </div>

      {/* Tasks */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Tasks ({tasks.length})</h3>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNewTaskOpen(true)}>
            <Plus size={13} /> Add Task
          </Button>
        </div>
        {!tasks.length ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks in this campaign"
            description="Add a task to track work for this campaign"
            action={<Button size="sm" onClick={() => setNewTaskOpen(true)}>+ Add Task</Button>}
          />
        ) : (
          <div className="space-y-1.5">
            {tasks.map(task => {
              const taskStatus = TASK_STATUSES.find(s => s.value === task.status)!
              return (
                <Link
                  key={task.id}
                  href={`/app/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-50 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {task.assignee?.full_name ?? 'Unassigned'}
                      {task.due_date ? ` · Due ${formatDate(task.due_date, 'dd MMM')}` : ''}
                    </p>
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Content ({contentItems.length})</h3>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNewContentOpen(true)}>
            <Plus size={13} /> Add Content
          </Button>
        </div>
        {!contentItems.length ? (
          <EmptyState
            icon={CalendarDays}
            title="No content in this campaign"
            description="Add content items to plan what gets created"
            action={<Button size="sm" onClick={() => setNewContentOpen(true)}>+ Add Content</Button>}
          />
        ) : (
          <div className="space-y-1.5">
            {contentItems.map(item => {
              const itemStatus = CONTENT_STATUSES.find(s => s.value === item.status)!
              const pv = (item as any).platforms?.[0] ?? item.platform
              const platform = PLATFORMS.find(p => p.value === pv) ?? PLATFORMS[0]
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-50 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-2 h-6 rounded-full shrink-0" style={{ backgroundColor: platform.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">
                      {platform.label}
                      {item.publish_at ? ` · ${formatDate(item.publish_at, 'dd MMM')}` : ''}
                    </p>
                  </div>
                  <StatusBadge label={itemStatus.label} color={itemStatus.color} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {newTaskOpen && (
        <NewTaskModal
          defaultStatus="todo"
          defaultCampaignId={campaign.id}
          defaultClientId={campaign.client_id}
          clients={clients}
          profiles={profiles}
          currentUserId={currentUserId}
          onCreated={task => {
            setTasks(prev => [...prev, task as TaskWithAssignee])
            setNewTaskOpen(false)
          }}
          onClose={() => setNewTaskOpen(false)}
        />
      )}

      {/* New Content Drawer */}
      {newContentOpen && (
        <ContentItemDrawer
          defaultCampaignId={campaign.id}
          defaultClientId={campaign.client_id}
          defaultDate={new Date().toISOString().slice(0, 10)}
          clients={clients}
          canApprove={true}
          onClose={() => setNewContentOpen(false)}
          onCreate={created => {
            setContentItems(prev => [...prev, created as ContentItem])
            setNewContentOpen(false)
          }}
        />
      )}
    </div>
  )
}
