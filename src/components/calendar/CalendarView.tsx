'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isToday, parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Columns, List, Calendar, CalendarDays, Clock, AlertCircle, Download, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLATFORMS, CONTENT_STATUSES, CONTENT_TYPES } from '@/lib/constants'
import type { ContentItem } from '@/types/database.types'
import ContentItemDrawer from './ContentItemDrawer'
import ContentKanbanBoard from './ContentKanbanBoard'

type ItemWithRelations = ContentItem & {
  client?: { name: string; slug: string; id: string } | null
  assignee?: { full_name: string } | null
}

interface Props {
  items: ItemWithRelations[]
  boardItems: any[]
  clients: { id: string; name: string; parent_client_id?: string | null }[]
  profiles: { id: string; full_name: string }[]
  year: number
  month: number
  canApprove: boolean
  currentUserId: string
  filters: { client?: string; platform?: string; status?: string; assignee?: string }
}

const ALL_COLUMNS = [
  { key: 'title',           label: 'Title',            always: true },
  { key: 'client',          label: 'Client',           always: false },
  { key: 'content_type',    label: 'Type',             always: false },
  { key: 'platform',        label: 'Platform',         always: false },
  { key: 'design_date',     label: 'Design Date',      always: false },
  { key: 'assignee',        label: 'Assignee',         always: false },
  { key: 'design_status',   label: 'Design Status',    always: false },
  { key: 'internal_review', label: 'Internal Review',  always: false },
  { key: 'client_approval', label: 'Client Approval',  always: false },
  { key: 'publish_date',    label: 'Publish Date',     always: false },
  { key: 'overall_status',  label: 'Overall Status',   always: false },
]

const DEFAULT_VISIBLE = new Set(['title', 'client', 'content_type', 'platform', 'design_date', 'publish_date', 'overall_status'])
const STORAGE_KEY = 'calendar_visible_cols_v2'

function getOverallStatus(item: ItemWithRelations): { label: string; color: string } {
  const liveLinks = item.live_links ?? {}
  const hasLive = Object.values(liveLinks).some(v => v)
  const ds = item.design_status ?? 'not_started'
  const ir = item.internal_review ?? 'pending'
  const ca = item.client_approval ?? 'pending'
  if (hasLive) return { label: 'Posted', color: '#16a34a' }
  if (ir === 'approved' && ca === 'approved') return { label: 'Ready to Post', color: '#2563eb' }
  if (ca === 'changes_required') return { label: 'Client Revisions', color: '#d97706' }
  if (ir === 'changes_required') return { label: 'Internal Revisions', color: '#d97706' }
  if (ir === 'approved' && ca === 'pending') return { label: 'Awaiting Client', color: '#7c3aed' }
  if (ds === 'done' && ir === 'pending') return { label: 'Awaiting Review', color: '#7c3aed' }
  if (ds === 'in_progress') return { label: 'In Design', color: '#0891b2' }
  return { label: 'Not Started', color: '#6b7280' }
}

function DesignStatusBadge({ value }: { value: string }) {
  const map: Record<string, { label: string; color: string }> = {
    not_started: { label: 'Not Started', color: '#9ca3af' },
    in_progress: { label: 'In Progress', color: '#0891b2' },
    done:        { label: 'Done', color: '#16a34a' },
  }
  const d = map[value] ?? { label: value, color: '#9ca3af' }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: d.color + '20', color: d.color }}>
      {d.label}
    </span>
  )
}

function ReviewBadge({ value }: { value: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending:          { label: 'Pending', color: '#9ca3af' },
    approved:         { label: 'Approved', color: '#16a34a' },
    changes_required: { label: 'Changes', color: '#d97706' },
    rejected:         { label: 'Rejected', color: '#dc2626' },
  }
  const d = map[value] ?? { label: value, color: '#9ca3af' }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: d.color + '20', color: d.color }}>
      {d.label}
    </span>
  )
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'overdue' | 'custom'

function toLocalDate(d: Date) {
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-')
}

const DATE_TABS: { key: DateFilter; label: string; icon: React.ElementType }[] = [
  { key: 'all',      label: 'All',      icon: List },
  { key: 'today',    label: 'Today',    icon: Calendar },
  { key: 'tomorrow', label: 'Tomorrow', icon: CalendarDays },
  { key: 'overdue',  label: 'Overdue',  icon: AlertCircle },
  { key: 'custom',   label: 'Custom',   icon: Clock },
]

export default function CalendarView({ items: initialItems, boardItems, clients, profiles, year, month, canApprove, currentUserId, filters }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)

  // Sync items when server refetches due to filter URL changes
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])
  const [selectedItem, setSelectedItem] = useState<ItemWithRelations | null>(null)
  const [createDate, setCreateDate] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'board' | 'calendar'>('list')
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return DEFAULT_VISIBLE
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? new Set(JSON.parse(saved)) : DEFAULT_VISIBLE
    } catch { return DEFAULT_VISIBLE }
  })
  const [colPickerOpen, setColPickerOpen] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const colPickerRef = useRef<HTMLDivElement>(null)

  const today = toLocalDate(new Date())
  const tomorrow = toLocalDate(new Date(Date.now() + 86400000))

  const currentDate = new Date(year, month - 1, 1)
  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
  const firstDayOffset = getDay(days[0])

  // Close col picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setColPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const navigate = (dir: number) => {
    const d = new Date(year, month - 1 + dir, 1)
    const q = new URLSearchParams({
      year: String(d.getFullYear()),
      month: String(d.getMonth() + 1),
      ...(filters.client   ? { client:   filters.client }   : {}),
      ...(filters.platform ? { platform: filters.platform } : {}),
      ...(filters.status   ? { status:   filters.status }   : {}),
      ...(filters.assignee ? { assignee: filters.assignee } : {}),
    })
    router.push(`/app/calendar?${q}`)
  }

  const filterNav = (key: string, value: string) => {
    const q = new URLSearchParams({
      year: String(year), month: String(month),
      ...(filters.client   ? { client:   filters.client }   : {}),
      ...(filters.platform ? { platform: filters.platform } : {}),
      ...(filters.status   ? { status:   filters.status }   : {}),
      ...(filters.assignee ? { assignee: filters.assignee } : {}),
      ...(value ? { [key]: value } : {}),
    })
    if (!value) q.delete(key)
    router.push(`/app/calendar?${q}`)
  }

  const itemsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return items.filter(item => item.publish_at && item.publish_at.startsWith(dateStr))
  }

  const handleItemUpdated = (updated: ItemWithRelations) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    setSelectedItem(null)
  }

  const handleItemCreated = (created: ItemWithRelations) => {
    setItems(prev => [...prev, created])
    setCreateDate(null)
  }

  const toggleCol = (key: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const downloadCSV = () => {
    const cols = ALL_COLUMNS.filter(c => c.always || visibleCols.has(c.key))
    const headers = cols.map(c => c.label)
    const rows = listItems.map(item => {
      const platform = PLATFORMS.find(p => p.value === (item.platforms?.[0] ?? item.platform))
      const os = getOverallStatus(item)
      return cols.map(col => {
        switch (col.key) {
          case 'title':           return item.title
          case 'client':          return item.client?.name ?? ''
          case 'content_type':    return CONTENT_TYPES.find(t => t.value === item.content_type)?.label ?? item.content_type ?? ''
          case 'platform':        return item.platforms?.join(', ') ?? platform?.label ?? ''
          case 'design_date':     return item.design_date ?? ''
          case 'assignee':        return item.assignee?.full_name ?? ''
          case 'design_status':   return item.design_status ?? ''
          case 'internal_review': return item.internal_review ?? ''
          case 'client_approval': return item.client_approval ?? ''
          case 'publish_date':    return item.publish_at ? item.publish_at.slice(0, 10) : ''
          case 'overall_status':  return os.label
          default:                return ''
        }
      })
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `content-${year}-${String(month).padStart(2,'0')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const visibleColDefs = ALL_COLUMNS.filter(c => c.always || visibleCols.has(c.key))

  // Date-filtered items for list view
  // Convert publish_at (UTC) to local date string for comparison with today/tomorrow
  const getPublishDate = (item: ItemWithRelations) =>
    item.publish_at ? toLocalDate(new Date(item.publish_at)) : null

  const listItems = useMemo(() => {
    let filtered: ItemWithRelations[]
    switch (dateFilter) {
      case 'today':    filtered = items.filter(i => getPublishDate(i) === today); break
      case 'tomorrow': filtered = items.filter(i => getPublishDate(i) === tomorrow); break
      case 'overdue':  filtered = items.filter(i => { const d = getPublishDate(i); const posted = Object.values(i.live_links ?? {}).some(v => v); return !!(d && d < today) && !posted }); break
      case 'custom':
        filtered = items.filter(i => {
          const d = getPublishDate(i); if (!d) return false
          if (customFrom && d < customFrom) return false
          if (customTo && d > customTo) return false
          return true
        }); break
      default: filtered = [...items]
    }
    // Always sort ascending by publish date
    return filtered.sort((a, b) => {
      const da = a.publish_at ?? ''
      const db = b.publish_at ?? ''
      return da < db ? -1 : da > db ? 1 : 0
    })
  }, [items, dateFilter, today, tomorrow, customFrom, customTo])

  const dateCounts: Record<DateFilter, number> = {
    all:      items.length,
    today:    items.filter(i => getPublishDate(i) === today).length,
    tomorrow: items.filter(i => getPublishDate(i) === tomorrow).length,
    overdue:  items.filter(i => { const d = getPublishDate(i); const posted = Object.values(i.live_links ?? {}).some(v => v); return !!(d && d < today) && !posted }).length,
    custom:   dateFilter === 'custom' ? listItems.length : 0,
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold text-gray-900 min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle — List | Board | Calendar */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {(['list', 'board', 'calendar'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={view === v
                  ? 'px-3 py-1 text-xs font-medium bg-white rounded-md shadow-sm text-gray-900 capitalize'
                  : 'px-3 py-1 text-xs text-gray-500 hover:text-gray-700 capitalize'}>
                {v}
              </button>
            ))}
          </div>

          {/* Column picker + CSV — only in list view */}
          {view === 'list' && (
            <>
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              title="Download CSV"
            >
              <Download size={13} /> Export
            </button>
            <div className="relative" ref={colPickerRef}>
              <button
                onClick={() => setColPickerOpen(o => !o)}
                className="flex items-center gap-1.5 h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              >
                <Columns size={13} /> Columns
              </button>
              {colPickerOpen && (
                <div className="absolute right-0 top-10 z-50 w-48 bg-white rounded-xl border border-gray-200 shadow-lg p-2">
                  {ALL_COLUMNS.filter(c => !c.always).map(col => (
                    <label key={col.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={visibleCols.has(col.key)}
                        onChange={() => toggleCol(col.key)}
                        className="accent-violet-600"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            </>
          )}

          {/* Filters */}
          <select value={filters.client ?? ''} onChange={e => filterNav('client', e.target.value)}
            className="h-8 px-2 text-xs rounded-lg border border-gray-200 bg-white">
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.platform ?? ''} onChange={e => filterNav('platform', e.target.value)}
            className="h-8 px-2 text-xs rounded-lg border border-gray-200 bg-white">
            <option value="">All platforms</option>
            {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={filters.status ?? ''} onChange={e => filterNav('status', e.target.value)}
            className="h-8 px-2 text-xs rounded-lg border border-gray-200 bg-white">
            <option value="">All statuses</option>
            {CONTENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filters.assignee ?? ''} onChange={e => filterNav('assignee', e.target.value)}
            className="h-8 px-2 text-xs rounded-lg border border-gray-200 bg-white">
            <option value="">All assignees</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>

          <Button size="sm" className="gap-1.5" onClick={() => setCreateDate(format(new Date(), 'yyyy-MM-dd'))}>
            <Plus size={13} /> New Content
          </Button>
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <>
        {/* Date filter tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {DATE_TABS.map(({ key, label, icon: Icon }) => {
            const active = dateFilter === key
            const count = dateCounts[key]
            return (
              <button key={key} onClick={() => setDateFilter(key)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border"
                style={active
                  ? { backgroundColor: '#ede9fe', borderColor: '#7c3aed', color: '#6d28d9' }
                  : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#6b7280' }}>
                <Icon size={13} />
                {label}
                {count > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none"
                    style={active ? { backgroundColor: '#7c3aed', color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
              <span className="text-gray-400 text-xs">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {visibleColDefs.map(col => (
                  <th key={col.key} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listItems.length === 0 ? (
                <tr>
                  <td colSpan={visibleColDefs.length} className="px-4 py-12 text-center text-sm text-gray-400">
                    {dateFilter === 'overdue' ? 'No overdue content 🎉' : 'No content for this filter'}
                  </td>
                </tr>
              ) : listItems.map(item => {
                const platform = PLATFORMS.find(p => p.value === (item.platforms?.[0] ?? item.platform))
                const statusObj = CONTENT_STATUSES.find(s => s.value === item.status)
                return (
                  <tr key={item.id} className="hover:bg-gray-50 cursor-pointer group" onClick={() => setSelectedItem(item)}>
                    {visibleCols.has('title') || true ? (
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{item.title}</span>
                          <Pencil size={11} className="text-gray-300 group-hover:text-violet-400 transition-colors shrink-0" />
                        </div>
                      </td>
                    ) : null}
                    {visibleCols.has('client') && (
                      <td className="px-4 py-3 text-gray-500">{item.client?.name ?? '—'}</td>
                    )}
                    {visibleCols.has('content_type') && (
                      <td className="px-4 py-3">
                        {item.content_type ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {CONTENT_TYPES.find(t => t.value === item.content_type)?.label ?? item.content_type}
                          </span>
                        ) : '—'}
                      </td>
                    )}
                    {visibleCols.has('platform') && (
                      <td className="px-4 py-3">
                        {item.platforms?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {item.platforms.slice(0, 3).map(pv => {
                              const pl = PLATFORMS.find(p => p.value === pv)
                              return (
                                <span key={pv} className="flex items-center gap-1 text-xs text-gray-600">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pl?.color }} />
                                  {pl?.label ?? pv}
                                </span>
                              )
                            })}
                            {item.platforms.length > 3 && <span className="text-xs text-gray-400">+{item.platforms.length - 3}</span>}
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5 text-gray-600 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: platform?.color }} />
                            {platform?.label ?? '—'}
                          </span>
                        )}
                      </td>
                    )}
                    {visibleCols.has('design_date') && (
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {item.design_date ? format(parseISO(item.design_date), 'dd/MM/yyyy') : '—'}
                      </td>
                    )}
                    {visibleCols.has('assignee') && (
                      <td className="px-4 py-3 text-gray-500 text-xs">{item.assignee?.full_name ?? '—'}</td>
                    )}
                    {visibleCols.has('design_status') && (
                      <td className="px-4 py-3"><DesignStatusBadge value={item.design_status ?? 'not_started'} /></td>
                    )}
                    {visibleCols.has('internal_review') && (
                      <td className="px-4 py-3"><ReviewBadge value={item.internal_review ?? 'pending'} /></td>
                    )}
                    {visibleCols.has('client_approval') && (
                      <td className="px-4 py-3"><ReviewBadge value={item.client_approval ?? 'pending'} /></td>
                    )}
                    {visibleCols.has('publish_date') && (
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {item.publish_at ? new Date(item.publish_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                      </td>
                    )}
                    {visibleCols.has('status') && (
                      <td className="px-4 py-3">
                        {statusObj && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: statusObj.color + '20', color: statusObj.color }}>
                            {statusObj.label}
                          </span>
                        )}
                      </td>
                    )}
                    {visibleCols.has('overall_status') && (() => {
                      const os = getOverallStatus(item)
                      return (
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: os.color + '20', color: os.color }}>
                            {os.label}
                          </span>
                        </td>
                      )
                    })()}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* ── BOARD VIEW ── */}
      {view === 'board' && (
        <ContentKanbanBoard
          initialItems={boardItems}
          clients={clients}
          canApprove={canApprove}
          currentUserId={currentUserId}
        />
      )}

      {/* ── CALENDAR GRID VIEW ── */}
      {view === 'calendar' && (
        <div className="flex-1 bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-2.5">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 flex-1">
            {/* Empty cells before month start */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="border-r border-b border-gray-50 min-h-[120px] bg-gray-50/50" />
            ))}

            {days.map(day => {
              const dayItems = itemsForDay(day)
              const today = isToday(day)
              const dateStr = format(day, 'yyyy-MM-dd')

              return (
                <div
                  key={dateStr}
                  className="border-r border-b border-gray-50 min-h-[120px] p-1.5 hover:bg-gray-50/50 transition-colors group"
                  onClick={() => setCreateDate(dateStr)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${today ? 'bg-gray-900 text-white' : 'text-gray-500'}`}>
                      {format(day, 'd')}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-600 transition-all">
                      <Plus size={12} />
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map(item => {
                      const pv = item.platforms?.[0] ?? item.platform
                      const platform = PLATFORMS.find(p => p.value === pv)
                      return (
                        <button
                          key={item.id}
                          onClick={e => { e.stopPropagation(); setSelectedItem(item) }}
                          className="w-full text-left px-1.5 py-0.5 rounded text-xs truncate font-medium transition-opacity hover:opacity-80"
                          style={{ backgroundColor: (platform?.color ?? '#6B7280') + '20', color: platform?.color ?? '#6B7280' }}
                        >
                          {item.title}
                        </button>
                      )
                    })}
                    {dayItems.length > 3 && (
                      <p className="text-xs text-gray-400 px-1.5">+{dayItems.length - 3} more</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Item Detail/Edit Drawer */}
      {selectedItem && (
        <ContentItemDrawer
          item={selectedItem}
          clients={clients}
          canApprove={canApprove}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleItemUpdated}
        />
      )}

      {/* New Content Drawer */}
      {createDate && (
        <ContentItemDrawer
          defaultDate={createDate}
          clients={clients}
          canApprove={canApprove}
          onClose={() => setCreateDate(null)}
          onCreate={handleItemCreated}
        />
      )}
    </div>
  )
}
