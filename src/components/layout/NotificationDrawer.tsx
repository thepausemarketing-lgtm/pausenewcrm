'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/database.types'
import { timeAgo } from '@/lib/utils'
import { Bell } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function NotificationDrawer({ open, onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      if (data) setNotifications(data)
    }
    load()
  }, [open])

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-gray-500 font-normal hover:text-gray-800">
                Mark all read
              </button>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1 overflow-y-auto max-h-[calc(100vh-100px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Bell size={32} className="mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`p-3 rounded-lg text-sm ${n.is_read ? 'bg-white' : 'bg-blue-50'}`}
              >
                <p className="font-medium text-gray-900">{n.title}</p>
                {n.body && <p className="text-gray-500 text-xs mt-0.5">{n.body}</p>}
                <p className="text-gray-400 text-xs mt-1">{timeAgo(n.created_at)}</p>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
