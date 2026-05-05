import { timeAgo } from '@/lib/utils'
import type { ActivityLog } from '@/types/database.types'
import { Clock } from 'lucide-react'
import EmptyState from './EmptyState'

interface Props {
  logs: (ActivityLog & { actor?: { full_name: string } | null })[]
}

const ACTION_LABELS: Record<string, string> = {
  created_client: 'Created client',
  updated_client: 'Updated client',
  created_task: 'Created task',
  updated_task: 'Updated task',
  completed_task: 'Completed task',
  created_content: 'Created content item',
  updated_content: 'Updated content item',
  published_content: 'Published content',
  created_campaign: 'Created campaign',
  uploaded_file: 'Uploaded a file',
}

export default function ActivityTimeline({ logs }: Props) {
  if (logs.length === 0) {
    return <EmptyState icon={Clock} title="No activity yet" />
  }

  return (
    <div className="space-y-3">
      {logs.map((log, i) => (
        <div key={log.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 shrink-0" />
            {i < logs.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
          </div>
          <div className="pb-3 min-w-0">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{log.actor?.full_name ?? 'Someone'}</span>
              {' '}{ACTION_LABELS[log.action] ?? log.action}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{timeAgo(log.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
