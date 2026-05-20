'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, XCircle, Eye } from 'lucide-react'

type LogEntry = {
  id: string
  type: string
  recipient_name: string
  full_message: string | null
  status: string
  triggered_by: string | null
  triggered_at: string
  triggerer?: { full_name: string } | null
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  daily_digest:      { label: 'Daily Digest',      color: 'bg-violet-50 text-violet-700' },
  task_assigned:     { label: 'Task Assigned',      color: 'bg-blue-50 text-blue-700' },
  campaign_assigned: { label: 'Campaign Assigned',  color: 'bg-amber-50 text-amber-700' },
  notification:      { label: 'Notification',       color: 'bg-gray-100 text-gray-600' },
}

export default function NotificationHistory() {
  const supabase = createClient()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<LogEntry | null>(null)

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

  if (loading) return <div className="text-sm text-gray-400 py-4">Loading…</div>

  if (logs.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-4">
        No messages sent yet.
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto -mx-6">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr>
              <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Recipient</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Date & Time</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Sent By</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map(log => {
              const meta = TYPE_LABELS[log.type] ?? TYPE_LABELS.notification
              const delivered = log.status === 'delivered'
              const who = log.triggerer?.full_name ?? 'Cron (auto)'
              const dt = new Date(log.triggered_at)
              const dateStr = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              const timeStr = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

              return (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {log.recipient_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">
                    <span>{dateStr}</span>
                    <span className="text-gray-400 ml-1.5">at {timeStr}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {delivered ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle2 size={13} /> Delivered
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                        <XCircle size={13} /> Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{who}</td>
                  <td className="px-4 py-3">
                    {log.full_message && (
                      <button
                        onClick={() => setViewing(log)}
                        className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
                      >
                        <Eye size={12} /> View
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Message preview modal */}
      {viewing && (
        <Dialog open onOpenChange={v => !v && setViewing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Message to {viewing.recipient_name}</DialogTitle>
            </DialogHeader>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto font-mono">
              {/* Strip HTML tags for display */}
              {viewing.full_message?.replace(/<b>/g, '').replace(/<\/b>/g, '').replace(/<i>/g, '').replace(/<\/i>/g, '').replace(/<a[^>]*>/g, '').replace(/<\/a>/g, '').replace(/&amp;/g, '&')}
            </div>
            <p className="text-xs text-gray-400">
              Sent {new Date(viewing.triggered_at).toLocaleString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
