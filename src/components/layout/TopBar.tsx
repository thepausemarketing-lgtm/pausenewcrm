'use client'

import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { NotificationDrawer } from './NotificationDrawer'

const BREADCRUMBS: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/clients': 'Clients',
  '/app/calendar': 'Content Calendar',
  '/app/calendar/board': 'Content Board',
  '/app/tasks': 'Tasks',
  '/app/tasks/all': 'All Tasks',
  '/app/tasks/board': 'Task Board',
  '/app/campaigns': 'Campaigns',
  '/app/renewals': 'Service Renewals',
  '/app/reports': 'Reports',
  '/app/reports/clients': 'Client Reports',
  '/app/reports/team': 'Team Reports',
  '/app/settings/profile': 'Profile Settings',
  '/app/settings/workspace': 'Workspace Settings',
  '/app/settings/team': 'Team Management',
  '/app/settings/notifications': 'Notifications',
}

function getPageTitle(pathname: string): string {
  if (BREADCRUMBS[pathname]) return BREADCRUMBS[pathname]
  const segments = pathname.split('/').filter(Boolean)
  if (segments[1] === 'clients' && segments[2]) return 'Client Details'
  if (segments[1] === 'campaigns' && segments[2]) return 'Campaign Details'
  if (segments[1] === 'calendar' && segments[2]) return 'Content Item'
  if (segments[1] === 'tasks' && segments[2]) return 'Task Details'
  return 'Pause Marketing'
}

export default function TopBar() {
  const pathname = usePathname()
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center">
        <span className="text-gray-400 text-sm mr-2">Pause Marketing /</span>
        <h1 className="text-sm font-semibold text-gray-800">{getPageTitle(pathname)}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setNotifOpen(true)}
          className="relative p-1.5 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
          title="Notifications"
        >
          <Bell size={16} />
        </button>
      </div>
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </header>
  )
}
