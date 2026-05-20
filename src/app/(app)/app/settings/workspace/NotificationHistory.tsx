'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

type LogEntry = {
  id: string
  type: string
  recipient_names: string[]
  recipient_ids: string[]
  message_preview: string | null
  triggered_by: string | null
  triggered_at: string
  triggerer?: { full_name: string } | null
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  daily_digest:       { label: 'Daily Digest',         color: 'bg-violet-50 text-violet-700' },
  task_assigned:      { label: 'Task Assigned',         color: 'bg-blue-50 text-blue-700' },
  campaign_assigned:  { label: 'Campaign Assigned',     color: 'bg-amber-50 text-amber-700' },
  notification:       { label: 'Notification',          color: 'bg-gray-100 text-gray-600' },
}

export default function NotificationHistory() {
  const supabase = createClient()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      const { data } = await (supabase as any)
        .from('notification_logs')
        .select('*, triggerer:profiles!notification_logs_triggered_by_fkey(full_name)')
        .order('triggered_at', { ascending: false })
        .limit(50)
      setLogs(data ?? [])
      setLoading(false)
    }
    run()
  }, [])

  if (loading) return <div className="text-sm text-gray-400 py-4">Loading history…</div>

  if (logs.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-4">
        No messages sent yet. Use "Send Digest Now" or wait for the 7 PM trigger.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map(log => {
        const meta = TYPE_LABELS[log.type] ?? TYPE_LABELS.notification
        const who = log.triggerer?.full_name ?? 'Cron (auto)'
        const recipients = log.recipient_names.join(', ')

        return (
          <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${meta.color}`}>
              {meta.label}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 truncate">
                → <span className="font-medium">{recipients || '—'}</span>
              </p>
              {log.message_preview && (
                <p className="text-xs text-gray-400 truncate mt-0.5">{log.message_preview}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                Sent by <span className="text-gray-600">{who}</span>
                {' · '}
                {new Date(log.triggered_at).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {log.recipient_ids.length} sent
            </span>
          </div>
        )
      })}
    </div>
  )
}
