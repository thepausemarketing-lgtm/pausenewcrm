'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Users, CalendarDays, CheckSquare,
  Megaphone, BarChart3, Settings, LogOut, UserCog, RefreshCw,
  Bell, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useRole } from '@/context/RoleContext'
import { getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NotificationDrawer } from './NotificationDrawer'

const NAV_ITEMS = [
  { href: '/app/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/app/clients',       icon: Users,           label: 'Clients' },
  { href: '/app/calendar',      icon: CalendarDays,    label: 'Calendar' },
  { href: '/app/tasks',         icon: CheckSquare,     label: 'Tasks' },
  { href: '/app/campaigns',     icon: Megaphone,       label: 'Campaigns' },
  { href: '/app/renewals',      icon: RefreshCw,       label: 'Renewals' },
  { href: '/app/reports',       icon: BarChart3,       label: 'Reports' },
  { href: '/app/settings/team', icon: UserCog,         label: 'Team' },
]

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useRole()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const isActive = (href: string) =>
    href === '/app/dashboard' ? pathname === href : pathname.startsWith(href)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Notification count
  useEffect(() => {
    let userId: string
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadCount(count ?? 0)
    }
    load()
    const channel = supabase.channel('notif-topnav')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        payload => { if ((payload.new as any).user_id === userId) setUnreadCount(c => c + 1) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' },
        () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <>
      {/* Top Nav Bar — fully opaque so content feels part of the page */}
      <header className="h-14 bg-transparent flex items-center px-6 shrink-0 relative">

        {/* Logo — left */}
        <Link href="/app/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center text-white text-xs font-bold tracking-tight">P</div>
          <span className="text-sm font-semibold text-gray-900 hidden sm:block">Pause Marketing<span className="text-gray-400 font-normal">.</span></span>
        </Link>

        {/* Desktop Nav — absolutely centered */}
        <nav className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <Icon size={16} />
                {/* Tooltip */}
                <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded-lg bg-gray-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Bell */}
          <button
            onClick={() => { setNotifOpen(true); setUnreadCount(0) }}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Settings */}
          <Link
            href="/app/settings/profile"
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
              pathname.startsWith('/app/settings')
                ? 'bg-gray-900 text-white'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            )}
          >
            <Settings size={16} />
          </Link>

          {/* Avatar + sign out */}
          <div className="flex items-center gap-2 ml-1 pl-3 border-l border-gray-100">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px] bg-gray-800 text-white font-semibold">
                {profile?.full_name ? getInitials(profile.full_name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:block">
              <p className="text-xs font-semibold text-gray-900 leading-none">{profile?.full_name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{profile?.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all ml-1"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-all"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile dropdown nav */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 px-4 pb-3 z-40">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                  active ? 'bg-gray-900 text-white font-medium' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon size={15} />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      )}

      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
