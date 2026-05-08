'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Bell, Search, Plus, CheckSquare, CalendarDays, X } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
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

// ---- Global Search Component ----
function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json() as SearchResults
      setResults(data)
    } catch {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchResults(val), 300)
  }

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults(null)
  }, [])

  // CMD+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        close()
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const hasResults =
    results && (results.clients.length > 0 || results.tasks.length > 0 || results.content.length > 0)
  const showDropdown = open && query.length >= 2

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search clients, tasks, content… ⌘K"
          className="w-64 h-8 pl-8 pr-7 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-400 focus:bg-white transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null); setOpen(false) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-1 left-0 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
          )}

          {!loading && !hasResults && (
            <div className="px-4 py-3 text-sm text-gray-400">No results for &quot;{query}&quot;</div>
          )}

          {!loading && hasResults && (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {results.clients.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50">
                    Clients
                  </div>
                  {results.clients.map(c => (
                    <Link
                      key={c.id}
                      href={`/app/clients/${c.slug}`}
                      onClick={close}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-violet-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
                      <span className="ml-auto text-xs text-gray-400 capitalize shrink-0">{c.status}</span>
                    </Link>
                  ))}
                </div>
              )}

              {results.tasks.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50">
                    Tasks
                  </div>
                  {results.tasks.map(t => (
                    <Link
                      key={t.id}
                      href={`/app/tasks/${t.id}`}
                      onClick={close}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-violet-50 transition-colors"
                    >
                      <CheckSquare size={13} className="text-violet-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{t.title}</div>
                        {t.client && (
                          <div className="text-xs text-gray-400 truncate">{t.client.name}</div>
                        )}
                      </div>
                      <span className="ml-auto text-xs text-gray-400 capitalize shrink-0">{t.status.replace('_', ' ')}</span>
                    </Link>
                  ))}
                </div>
              )}

              {results.content.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50">
                    Content
                  </div>
                  {results.content.map(c => (
                    <Link
                      key={c.id}
                      href={`/app/calendar/${c.id}`}
                      onClick={close}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-violet-50 transition-colors"
                    >
                      <CalendarDays size={13} className="text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{c.title}</div>
                        {c.client && (
                          <div className="text-xs text-gray-400 truncate">{c.client.name}</div>
                        )}
                      </div>
                      <span className="ml-auto text-xs text-gray-400 capitalize shrink-0">{c.status.replace('_', ' ')}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---- Quick Create Button ----
function QuickCreate() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNewTask = () => {
    setOpen(false)
    router.push('/app/tasks?new=1')
  }

  const handleNewContent = () => {
    setOpen(false)
    router.push('/app/calendar?new=1')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm"
        title="Quick create"
      >
        <Plus size={15} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
          <button
            onClick={handleNewTask}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 transition-colors"
          >
            <CheckSquare size={14} className="text-violet-500 shrink-0" />
            New Task
          </button>
          <button
            onClick={handleNewContent}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 transition-colors"
          >
            <CalendarDays size={14} className="text-blue-500 shrink-0" />
            New Content
          </button>
        </div>
      )}
    </div>
  )
}

// ---- Main TopBar ----
export default function TopBar() {
  const pathname = usePathname()
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center">
        <span className="text-gray-400 text-sm mr-2">Pause Marketing /</span>
        <h1 className="text-sm font-semibold text-gray-800">{getPageTitle(pathname)}</h1>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        <QuickCreate />
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
