'use client'

import { useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { Plus, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLATFORMS } from '@/lib/constants'
import type { ContentItem } from '@/types/database.types'
import ContentKanbanCard from './ContentKanbanCard'
import ContentItemDrawer from './ContentItemDrawer'
import Link from 'next/link'

type ItemWithRelations = ContentItem & {
  client?: { name: string; slug: string; id: string } | null
  assignee?: { full_name: string; avatar_url: string | null } | null
}

interface ColDef {
  key: string
  label: string
  color: string
  match: (item: ItemWithRelations) => boolean
  // Fields to write when dropping into this column. null = not droppable.
  update: Partial<Pick<ContentItem, 'design_status' | 'internal_review' | 'client_approval'>> | null
}

const COLS: ColDef[] = [
  {
    key: 'not_started',
    label: 'Not Started',
    color: '#9ca3af',
    match: item => (item.design_status ?? 'not_started') === 'not_started',
    update: { design_status: 'not_started', internal_review: 'pending', client_approval: 'pending' },
  },
  {
    key: 'in_design',
    label: 'In Design',
    color: '#0891b2',
    match: item => item.design_status === 'in_progress',
    update: { design_status: 'in_progress' },
  },
  {
    key: 'awaiting_review',
    label: 'Awaiting Review',
    color: '#7c3aed',
    match: item =>
      item.design_status === 'done' &&
      (item.internal_review ?? 'pending') === 'pending',
    update: { design_status: 'done', internal_review: 'pending' },
  },
  {
    key: 'revisions',
    label: 'Revisions',
    color: '#d97706',
    match: item =>
      item.internal_review === 'changes_required' ||
      item.client_approval === 'changes_required',
    update: { client_approval: 'changes_required' },
  },
  {
    key: 'awaiting_client',
    label: 'Awaiting Client',
    color: '#8b5cf6',
    match: item =>
      item.internal_review === 'approved' &&
      (item.client_approval ?? 'pending') === 'pending',
    update: { internal_review: 'approved', client_approval: 'pending' },
  },
  {
    key: 'ready',
    label: 'Ready to Post',
    color: '#2563eb',
    match: item => {
      const hasLive = Object.values(item.live_links as Record<string, unknown> ?? {}).some(v => v)
      return !hasLive && item.internal_review === 'approved' && item.client_approval === 'approved'
    },
    update: { internal_review: 'approved', client_approval: 'approved' },
  },
  {
    key: 'posted',
    label: 'Posted',
    color: '#16a34a',
    match: item => Object.values(item.live_links as Record<string, unknown> ?? {}).some(v => v),
    update: null, // read-only column — set via live_links in drawer
  },
]

function DroppableColumn({ col, children }: { col: ColDef; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key, disabled: col.update === null })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[200px] space-y-2 p-2 rounded-xl border transition-colors ${
        isOver && col.update
          ? 'border-violet-300 bg-violet-50'
          : 'border-gray-100 bg-gray-50'
      }`}
    >
      {children}
    </div>
  )
}

interface Props {
  initialItems: ItemWithRelations[]
  clients: { id: string; name: string }[]
  canApprove: boolean
  currentUserId: string
}

export default function ContentKanbanBoard({ initialItems, clients, canApprove, currentUserId }: Props) {
  const [items, setItems] = useState(initialItems)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<ItemWithRelations | null>(null)
  const [createCol, setCreateCol] = useState<string | null>(null)
  const [clientFilter, setClientFilter] = useState('')
  const supabase = createClient()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const filtered = clientFilter ? items.filter(i => i.client_id === clientFilter) : items

  const itemsForCol = (col: ColDef) => filtered.filter(col.match)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const itemId = active.id as string
    const colKey = over.id as string
    const col = COLS.find(c => c.key === colKey)
    if (!col || !col.update) return

    // Optimistic update
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...col.update } : i))

    // Persist to DB
    await (supabase as any).from('content_items').update(col.update).eq('id', itemId)
  }

  const handleItemUpdated = (updated: ItemWithRelations) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    setSelectedItem(null)
  }

  const handleItemCreated = (created: ItemWithRelations) => {
    setItems(prev => [created, ...prev])
    setCreateCol(null)
  }

  const activeItem = items.find(i => i.id === activeId)

  // Pre-fill when opening "create" from a column — map col key to initial field values
  const colToInitialFields: Record<string, Partial<ContentItem>> = {
    in_design:      { design_status: 'in_progress' },
    awaiting_review: { design_status: 'done' },
    awaiting_client: { internal_review: 'approved' },
    ready:          { internal_review: 'approved', client_approval: 'approved' },
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Link href="/app/calendar">
            <Button variant="outline" size="sm" className="gap-1.5">
              <List size={14} /> List / Calendar
            </Button>
          </Link>
        </div>
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none"
        >
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={e => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1 items-start">
          {COLS.map(col => {
            const colItems = itemsForCol(col)
            return (
              <div key={col.key} className="flex-shrink-0 w-64 flex flex-col">
                {/* Column header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {colItems.length}
                    </span>
                  </div>
                  {col.update !== null && (
                    <button
                      onClick={() => setCreateCol(col.key)}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  )}
                </div>

                {/* Droppable column */}
                <DroppableColumn col={col}>
                  {colItems.map(item => (
                    <ContentKanbanCard
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedItem(item)}
                      isDragging={activeId === item.id}
                    />
                  ))}
                  {colItems.length === 0 && (
                    <div className="flex items-center justify-center h-16 text-xs text-gray-400">
                      {col.update === null ? 'No items' : 'Drop here'}
                    </div>
                  )}
                </DroppableColumn>

                {col.update !== null && (
                  <button
                    onClick={() => setCreateCol(col.key)}
                    className="mt-2 w-full flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Plus size={11} /> Add content
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeItem && (
            <ContentKanbanCard item={activeItem} onClick={() => {}} isDragging />
          )}
        </DragOverlay>
      </DndContext>

      {/* Edit drawer */}
      {selectedItem && (
        <ContentItemDrawer
          item={selectedItem as any}
          clients={clients}
          canApprove={canApprove}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleItemUpdated as any}
        />
      )}

      {/* Create drawer from column */}
      {createCol && (
        <ContentItemDrawer
          clients={clients}
          canApprove={canApprove}
          onClose={() => setCreateCol(null)}
          onCreate={handleItemCreated as any}
        />
      )}
    </div>
  )
}
