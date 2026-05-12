'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Bell, Search, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import { NotificationDrawer } from './NotificationDrawer'
import { useSidebar } from '@/context/SidebarContext'
import { createClient } from '@/lib/supabase/client'

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

// ---- Types for search results ----
interface ClientResult {
  id: string
  name: string
  slug: string
  status: string
}

interface TaskResult {
  id: string
  title: string
  status: string
  client: { name: string; slug: string } | null
}

interface ContentResult {
  id: string
  title: string
  status: string
  client: { name: string; slug: string } | null
}

interface SearchResults {
  clients: ClientResult[]
  tasks: TaskResult[]
  content: ContentResult[]
}

// ---- Command Palette ----
function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ clients: [], tasks: [], content: [] })
  const router = useRouter()

  // CMD+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults({ clients: [], tasks: [], content: [] })
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        setResults(await res.json() as SearchResults)
      } catch {
        setResults({ clients: [], tasks: [], content: [] })
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const navigate = (href: string) => {
    router.push(href)
    setOpen(false)
    setQuery('')
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-lg transition-colors w-56"
    >
      <Search size={12} />
      <span>Search or run command…</span>
      <kbd className="ml-auto text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
    </button>
  )

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpen(false)} />
      {/* Palette */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search or type a command…"
            className="flex-1 text-sm outline-none placeholder:text-gray-400"
            onKeyDown={e => e.key === 'Escape' && setOpen(false)}
          />
          <kbd className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto py-2">
          {/* Actions section */}
          <SectionHeader label="Actions" />
          {[
            { label: 'New Task', icon: '✅', href: '/app/tasks?new=1' },
            { label: 'New Content Item', icon: '📅', href: '/app/calendar?new=1' },
            { label: 'Go to Dashboard', icon: '🏠', href: '/app/dashboard' },
            { label: 'Go to Calendar', icon: '📆', href: '/app/calendar' },
            { label: 'Go to Tasks', icon: '☑️', href: '/app/tasks' },
            { label: 'Go to Clients', icon: '👥', href: '/app/clients' },
            { label: 'Go to Reports', icon: '📊', href: '/app/reports' },
          ]
            .filter(a => !query || a.label.toLowerCase().includes(query.toLowerCase()))
            .map(a => (
              <CommandItem key={a.href} icon={a.icon} label={a.label} onClick={() => navigate(a.href)} />
            ))}

          {/* Search results */}
          {results.clients.length > 0 && (
            <>
              <SectionHeader label="Clients" />
              {results.clients.map((c: ClientResult) => (
                <CommandItem
                  key={c.id}
                  icon="👤"
                  label={c.name}
                  sub={c.status}
                  onClick={() => navigate(`/app/clients/${c.slug}`)}
                />
              ))}
            </>
          )}
          {results.tasks.length > 0 && (
            <>
              <SectionHeader label="Tasks" />
              {results.tasks.map((t: TaskResult) => (
                <CommandItem
                  key={t.id}
                  icon="✅"
                  label={t.title}
                  sub={t.client?.name}
                  onClick={() => navigate(`/app/tasks/${t.id}`)}
                />
              ))}
            </>
          )}
          {results.content.length > 0 && (
            <>
              <SectionHeader label="Content" />
              {results.content.map((c: ContentResult) => (
                <CommandItem
                  key={c.id}
                  icon="📅"
                  label={c.title}
                  sub={c.client?.name}
                  onClick={() => navigate(`/app/calendar/${c.id}`)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-1.5">
      {label}
    </p>
  )
}

function CommandItem({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: string
  label: string
  sub?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 text-left transition-colors"
    >
      <span className="text-base">{icon}</span>
      <span className="flex-1 text-gray-800">{label}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </button>
  )
}

// ---- Main TopBar ----
export default function TopBar() {
  const pathname = usePathname()
  const [notifOpen, setNotifOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { setMobileOpen } = useSidebar()
  const supabase = createClient()

  // Load unread count + subscribe to real-time inserts
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

    const channel = supabase
      .channel('notif-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        payload => { if ((payload.new as any).user_id === userId) setUnreadCount(c => c + 1) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' },
        () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <header className="h-12 bg-white/80 backdrop-blur border-b border-violet-100/60 flex items-center justify-between px-6 shrink-0 relative">
      <div className="flex items-center gap-2">
        {/* Hamburger button: only visible on mobile */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          title="Open menu"
        >
          <Menu size={18} />
        </button>
        <span className="text-gray-400 text-sm mr-2">Pause Marketing /</span>
        <h1 className="text-sm font-semibold text-gray-800">{getPageTitle(pathname)}</h1>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <CommandPalette />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => { setNotifOpen(true); setUnreadCount(0) }}
          className="relative p-1.5 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
          title="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </header>
  )
}
