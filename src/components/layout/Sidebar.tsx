'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Users, CalendarDays, CheckSquare,
  Megaphone, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, UserCog, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRole } from '@/context/RoleContext'
import { getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const NAV_ITEMS = [
  { href: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/app/clients', icon: Users, label: 'Clients' },
  { href: '/app/calendar', icon: CalendarDays, label: 'Content Calendar' },
  { href: '/app/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/app/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/app/renewals', icon: RefreshCw, label: 'Renewals' },
  { href: '/app/reports', icon: BarChart3, label: 'Reports' },
  { href: '/app/settings/team', icon: UserCog, label: 'Team' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const { profile } = useRole()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/app/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <aside
      style={{ backgroundColor: '#191919' }}
      className={cn(
        'h-screen flex flex-col transition-all duration-200 shrink-0',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 px-4 border-b border-white/10',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-violet-500 shrink-0 flex items-center justify-center text-white text-xs font-bold">P</div>
            <span className="text-sm font-semibold text-white truncate">Pause Marketing</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-all',
                collapsed ? 'justify-center' : '',
                active
                  ? 'bg-white/[0.1] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
              )}
            >
              <Icon size={16} />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Settings + User */}
      <div className="border-t border-white/10 p-3 space-y-0.5">
        <Link
          href="/app/settings/profile"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
            collapsed ? 'justify-center' : '',
            pathname.startsWith('/app/settings')
              ? 'bg-white/[0.1] text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
          )}
        >
          <Settings size={16} />
          {!collapsed && <span>Settings</span>}
        </Link>

        <div className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg mt-1',
          collapsed ? 'justify-center' : ''
        )}>
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] bg-violet-600 text-white font-semibold">
              {profile?.full_name ? getInitials(profile.full_name) : '?'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{profile?.full_name}</p>
              <p className="text-[10px] text-gray-500 capitalize">{profile?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
