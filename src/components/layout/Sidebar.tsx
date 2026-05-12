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
import { useSidebar } from '@/context/SidebarContext'
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
  const { mobileOpen, setMobileOpen } = useSidebar()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/app/dashboard' ? pathname === href : pathname.startsWith(href)

  const handleNavClick = () => {
    // Close mobile sidebar on nav link click
    setMobileOpen(false)
  }

  const sidebarContent = (
    <aside
      className={cn(
        'h-full flex flex-col transition-all duration-200 shrink-0 bg-white border-r border-gray-100',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 px-4 border-b border-gray-100',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gray-900 shrink-0 flex items-center justify-center text-white text-xs font-bold">P</div>
            <span className="text-sm font-semibold text-gray-900 truncate">Pause Marketing</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
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
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-all relative',
                collapsed ? 'justify-center' : '',
                active
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-lime-400 rounded-r-full" />
              )}
              <Icon size={16} />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Settings + User */}
      <div className="border-t border-gray-100 p-3 space-y-0.5">
        <Link
          href="/app/settings/profile"
          onClick={handleNavClick}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative',
            collapsed ? 'justify-center' : '',
            pathname.startsWith('/app/settings')
              ? 'bg-gray-100 text-gray-900 font-medium'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          )}
        >
          {pathname.startsWith('/app/settings') && !collapsed && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-lime-400 rounded-r-full" />
          )}
          <Settings size={16} />
          {!collapsed && <span>Settings</span>}
        </Link>

        <div className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg mt-1',
          collapsed ? 'justify-center' : ''
        )}>
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] bg-gray-800 text-white font-semibold">
              {profile?.full_name ? getInitials(profile.full_name) : '?'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{profile?.full_name}</p>
              <p className="text-[10px] text-gray-400 capitalize">{profile?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar: always visible, collapsible */}
      <div className="hidden md:flex h-screen">
        {sidebarContent}
      </div>

      {/* Mobile sidebar: overlay when mobileOpen */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar panel */}
          <div className="relative z-50 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
