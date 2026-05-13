'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { PLATFORMS, CONTENT_TYPES, CONTENT_STATUSES } from '@/lib/constants'
import AssigneeStack from '@/components/shared/AssigneeStack'
import type { ContentItem } from '@/types/database.types'

type ContentAssigneeRef = {
  user_id: string
  user: { id: string; full_name: string; avatar_url: string | null } | null
}

type ItemWithRelations = ContentItem & {
  client?: { name: string; slug: string; id: string; logo_url?: string | null } | null
  assignee?: { full_name: string } | null
  content_assignees?: ContentAssigneeRef[]
}

interface Props {
  item: ItemWithRelations
  profiles: { id: string; full_name: string }[]
  visibleCols: Set<string>
  canApprove: boolean
  onOpenDrawer: (item: ItemWithRelations) => void
  onUpdate: (updated: ItemWithRelations) => void
}

const DESIGN_STATUSES = [
  { value: 'not_started', label: 'Not Started', color: '#9ca3af' },
  { value: 'in_progress', label: 'In Progress', color: '#0891b2' },
  { value: 'done',        label: 'Done',        color: '#16a34a' },
]

const REVIEW_STATUSES = [
  { value: 'pending',          label: 'Pending',  color: '#9ca3af' },
  { value: 'approved',         label: 'Approved', color: '#16a34a' },
  { value: 'changes_required', label: 'Changes',  color: '#d97706' },
  { value: 'rejected',         label: 'Rejected', color: '#dc2626' },
]

function getOverallStatus(item: ItemWithRelations): { label: string; color: string } {
  const hasLive = Object.values(item.live_links ?? {}).some(v => v)
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

async function patchItem(id: string, patch: Record<string, unknown>) {
  await fetch(`/api/content-items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

// Overlay-select badge pattern
function SelectBadge({
  value,
  options,
  color,
  onChange,
  disabled,
}: {
  value: string
  options: { value: string; label: string; color: string }[]
  color: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const opt = options.find(o => o.value === value)
  const label = opt?.label ?? value
  return (
    <div className={`relative inline-block rounded-full ${!disabled ? 'hover:ring-2 hover:ring-gray-200 transition-all cursor-pointer' : ''}`}>
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: color + '20', color }}
      >
        {label}
      </span>
      {!disabled && (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </div>
  )
}

export default function InlineContentRow({ item, profiles, visibleCols, canApprove, onOpenDrawer, onUpdate }: Props) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(item.title)

  const saveTitle = async () => {
    setEditingTitle(false)
    if (!titleVal.trim() || titleVal === item.title) return
    onUpdate({ ...item, title: titleVal })
    await patchItem(item.id, { title: titleVal })
  }

  const patch = async (field: string, value: unknown) => {
    onUpdate({ ...item, [field]: value })
    await patchItem(item.id, { [field]: value })
  }

  const overallStatus = getOverallStatus(item)

  const statusObj = CONTENT_STATUSES.find(s => s.value === item.status)
  const designStatusObj = DESIGN_STATUSES.find(s => s.value === (item.design_status ?? 'not_started'))
  const internalReviewObj = REVIEW_STATUSES.find(s => s.value === (item.internal_review ?? 'pending'))
  const clientApprovalObj = REVIEW_STATUSES.find(s => s.value === (item.client_approval ?? 'pending'))

  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors group">
      {/* Title — always visible */}
      <td className="px-4 py-2.5 min-w-0" onClick={e => e.stopPropagation()}>
        {editingTitle ? (
          <input
            autoFocus
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
            className="text-sm font-medium text-gray-900 border-b-2 border-violet-400 outline-none bg-transparent w-full"
          />
        ) : (
          <span
            className="text-sm font-medium text-gray-900 hover:text-violet-700 cursor-pointer"
            onClick={() => onOpenDrawer(item)}
            onDoubleClick={() => { setEditingTitle(true); setTitleVal(item.title) }}
            title="Click to open · Double-click to rename"
          >
            {item.title}
          </span>
        )}
      </td>

      {/* Client */}
      {visibleCols.has('client') && (
        <td className="px-4 py-2.5 text-xs text-gray-500">
          {item.client
            ? (
              <span className="inline-flex items-center gap-1.5">
                {item.client.logo_url
                  ? <img src={item.client.logo_url} alt="" className="w-4 h-4 rounded object-contain flex-shrink-0" />
                  : null
                }
                {item.client.name}
              </span>
            )
            : <span className="text-gray-300">—</span>
          }
        </td>
      )}

      {/* Content Type */}
      {visibleCols.has('content_type') && (
        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
          <div className="relative inline-block rounded-full hover:ring-2 hover:ring-gray-200 transition-all cursor-pointer">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {CONTENT_TYPES.find(t => t.value === item.content_type)?.label ?? item.content_type ?? '—'}
            </span>
            <select
              value={item.content_type ?? ''}
              onChange={e => patch('content_type', e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            >
              {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </td>
      )}

      {/* Platform */}
      {visibleCols.has('platform') && (
        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
          {item.platforms?.length ? (
            <div className="flex flex-wrap gap-1">
              {item.platforms.slice(0, 2).map(pv => {
                const pl = PLATFORMS.find(p => p.value === pv)
                return (
                  <span key={pv} className="flex items-center gap-1 text-xs text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pl?.color }} />
                    {pl?.label ?? pv}
                  </span>
                )
              })}
              {item.platforms.length > 2 && <span className="text-xs text-gray-400">+{item.platforms.length - 2}</span>}
            </div>
          ) : (
            <div className="relative inline-block">
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PLATFORMS.find(p => p.value === item.platform)?.color }} />
                {PLATFORMS.find(p => p.value === item.platform)?.label ?? <span className="text-gray-300">—</span>}
              </span>
              <select
                value={item.platform ?? ''}
                onChange={e => patch('platform', e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              >
                <option value="">No platform</option>
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          )}
        </td>
      )}

      {/* Design Date */}
      {visibleCols.has('design_date') && (
        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
          <div className="relative inline-block px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <span className="text-xs text-gray-500">
              {item.design_date ? format(parseISO(item.design_date), 'dd/MM/yyyy') : <span className="text-gray-400">Set date</span>}
            </span>
            <input
              type="date"
              value={item.design_date ?? ''}
              onChange={e => patch('design_date', e.target.value || null)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              title="Change design date"
            />
          </div>
        </td>
      )}

      {/* Assignee */}
      {visibleCols.has('assignee') && (
        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
          <div className="relative inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            {item.content_assignees && item.content_assignees.length > 0 ? (
              <AssigneeStack assignees={item.content_assignees} size="xs" />
            ) : (
              <span className="text-xs text-gray-400">Assign</span>
            )}
            <select
              value={item.assigned_to ?? ''}
              onChange={e => patch('assigned_to', e.target.value || null)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              title="Change assignee"
            >
              <option value="">Unassigned</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
        </td>
      )}

      {/* Design Status */}
      {visibleCols.has('design_status') && (
        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
          <SelectBadge
            value={item.design_status ?? 'not_started'}
            options={DESIGN_STATUSES}
            color={designStatusObj?.color ?? '#9ca3af'}
            onChange={v => patch('design_status', v)}
          />
        </td>
      )}

      {/* Internal Review */}
      {visibleCols.has('internal_review') && (
        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
          <SelectBadge
            value={item.internal_review ?? 'pending'}
            options={REVIEW_STATUSES}
            color={internalReviewObj?.color ?? '#9ca3af'}
            onChange={v => patch('internal_review', v)}
            disabled={!canApprove}
          />
        </td>
      )}

      {/* Client Approval */}
      {visibleCols.has('client_approval') && (
        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
          <SelectBadge
            value={item.client_approval ?? 'pending'}
            options={REVIEW_STATUSES}
            color={clientApprovalObj?.color ?? '#9ca3af'}
            onChange={v => patch('client_approval', v)}
            disabled={!canApprove}
          />
        </td>
      )}

      {/* Publish Date */}
      {visibleCols.has('publish_date') && (
        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
          <div className="relative inline-block px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <span className="text-xs text-gray-500">
              {item.publish_at ? (
                <span className="flex items-center gap-1">
                  <span className="text-gray-400">{format(new Date(item.publish_at), 'EEE')}</span>
                  {new Date(item.publish_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </span>
              ) : <span className="text-gray-400">Set date</span>}
            </span>
            <input
              type="date"
              value={item.publish_at ? item.publish_at.slice(0, 10) : ''}
              onChange={e => patch('publish_at', e.target.value ? e.target.value + 'T00:00:00' : null)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              title="Change publish date"
            />
          </div>
        </td>
      )}

      {/* Overall Status — computed, read-only, click to open drawer */}
      {visibleCols.has('overall_status') && (
        <td className="px-4 py-2.5 cursor-pointer" onClick={() => onOpenDrawer(item)}>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: overallStatus.color + '20', color: overallStatus.color }}
          >
            {overallStatus.label}
          </span>
        </td>
      )}
    </tr>
  )
}
