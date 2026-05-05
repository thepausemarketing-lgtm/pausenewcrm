'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { PLATFORMS, CONTENT_TYPES, CONTENT_STATUSES } from '@/lib/constants'
import type { ContentItem } from '@/types/database.types'
import { useRole } from '@/context/RoleContext'

type ItemWithRelations = ContentItem & {
  client?: { name: string; slug: string; id: string } | null
  assignee?: { full_name: string } | null
}

const APPROVABLE_STATUSES = ['approved', 'scheduled', 'published']

interface Props {
  item?: ItemWithRelations
  defaultDate?: string
  clients: { id: string; name: string }[]
  canApprove: boolean
  onClose: () => void
  onUpdate?: (item: ItemWithRelations) => void
  onCreate?: (item: ItemWithRelations) => void
}

function getOverallStatus(
  liveLinks: Record<string, string>,
  internalReview: string,
  clientApproval: string,
  designStatus: string
): { label: string; color: string } {
  const hasLive = Object.keys(liveLinks || {}).some(k => liveLinks[k])
  if (hasLive) return { label: '🟢 Posted', color: '#16a34a' }
  if (internalReview === 'approved' && clientApproval === 'approved') return { label: '✅ Ready to Post', color: '#2563eb' }
  if (clientApproval === 'changes_required') return { label: '🔄 Client Revisions', color: '#d97706' }
  if (internalReview === 'changes_required') return { label: '🔄 Internal Revisions', color: '#d97706' }
  if (internalReview === 'approved' && clientApproval === 'pending') return { label: '⏳ Awaiting Client', color: '#7c3aed' }
  if (designStatus === 'done' && internalReview === 'pending') return { label: '⏳ Awaiting Review', color: '#7c3aed' }
  if (designStatus === 'in_progress') return { label: '🎨 In Design', color: '#0891b2' }
  return { label: '🕐 Not Started', color: '#6b7280' }
}

export default function ContentItemDrawer({ item, defaultDate, clients, canApprove, onClose, onUpdate, onCreate }: Props) {
  const { profile } = useRole()
  const supabase = createClient()
  const isNew = !item

  const [title, setTitle] = useState(item?.title ?? '')
  const [contentType, setContentType] = useState<ContentItem['content_type']>(item?.content_type ?? 'post')
  const [platforms, setPlatforms] = useState<string[]>(
    item?.platforms?.length ? item.platforms : item?.platform ? [item.platform] : ['instagram']
  )
  const [status, setStatus] = useState(item?.status ?? 'draft')
  const [caption, setCaption] = useState(item?.caption ?? '')
  const [publishAt, setPublishAt] = useState(
    item?.publish_at
      ? new Date(item.publish_at).toISOString().slice(0, 16)
      : defaultDate ? `${defaultDate}T09:00` : ''
  )
  const [clientId, setClientId] = useState(
    item ? ((item.client as { id: string } | null)?.id ?? '') : ''
  )
  const [designStatus, setDesignStatus] = useState(item?.design_status ?? 'not_started')
  const [internalReview, setInternalReview] = useState(item?.internal_review ?? 'pending')
  const [clientApproval, setClientApproval] = useState(item?.client_approval ?? 'pending')
  const [referenceLink, setReferenceLink] = useState(item?.reference_link ?? '')
  const [liveLinks, setLiveLinks] = useState<Record<string, string>>(item?.live_links ?? {})
  const [designDate, setDesignDate] = useState(item?.design_date ?? '')
  const [assignedTo, setAssignedTo] = useState(item?.assigned_to ?? '')
  const [profilesList, setProfilesList] = useState<{ id: string; full_name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    createClient().from('profiles').select('id, full_name').eq('is_active', true).order('full_name').then(({ data }) => setProfilesList(data ?? []))
  }, [])

  const togglePlatform = (val: string) => {
    setPlatforms(prev => prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val])
  }

  const allowedStatuses = canApprove
    ? CONTENT_STATUSES
    : CONTENT_STATUSES.filter(s => !APPROVABLE_STATUSES.includes(s.value))

  const overallStatus = getOverallStatus(liveLinks, internalReview, clientApproval, designStatus)

  const handleSave = async () => {
    if (!title.trim()) return
    if (!profile) return
    setSaving(true)
    setSaveError(null)

    const payload = {
      title: title.trim(),
      ...(clientId ? { client_id: clientId } : {}),
      platforms,
      platform: (platforms[0] ?? 'instagram') as ContentItem['platform'],
      content_type: contentType as ContentItem['content_type'],
      status: status as ContentItem['status'],
      caption: caption || null,
      publish_at: publishAt ? new Date(publishAt).toISOString() : null,
      design_date: designDate || null,
      reference_link: referenceLink || null,
      design_status: designStatus,
      internal_review: internalReview,
      client_approval: clientApproval,
      live_links: liveLinks,
      assigned_to: assignedTo || null,
    }

    if (isNew) {
      if (!clientId) { setSaveError('Please select a client'); setSaving(false); return }
      const { data: rawData, error } = await supabase
        .from('content_items')
        .insert({ ...payload, client_id: clientId, created_by: profile.id })
        .select('*, client:clients(name,slug,id), assignee:profiles!content_items_assigned_to_fkey(full_name)')
        .single()
      const data = rawData as ItemWithRelations | null
      if (error) {
        setSaveError(error.message)
      } else if (data && onCreate) {
        await supabase.from('activity_logs').insert({
          actor_id: profile.id, action: 'created_content', entity_type: 'content_item', entity_id: data.id,
        })
        onCreate(data)
      }
    } else {
      const { data, error } = await supabase
        .from('content_items')
        .update(payload)
        .eq('id', item.id)
        .select('*, client:clients(name,slug,id), assignee:profiles!content_items_assigned_to_fkey(full_name)')
        .single()
      if (error) {
        setSaveError(error.message)
      } else if (data && onUpdate) {
        onUpdate(data as ItemWithRelations)
      }
    }
    setSaving(false)
  }

  return (
    <Sheet open onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>{isNew ? 'New Content Item' : 'Edit Content Item'}</SheetTitle>
        </SheetHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Overall Status Badge */}
          {!isNew && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Status:</span>
              <span
                style={{ backgroundColor: overallStatus.color + '20', color: overallStatus.color }}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
              >
                {overallStatus.label}
              </span>
            </div>
          )}

          {/* Section: Basic Info */}
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Content title" autoFocus={isNew} />
          </div>

          <div className="space-y-1.5">
            <Label>Client *</Label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400"
            >
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Section: Platforms (multi-select) */}
          <div className="space-y-1.5">
            <Label>Platforms</Label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map(p => (
                <label
                  key={p.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all ${platforms.includes(p.value) ? 'border-gray-900 bg-gray-50 text-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  <input type="checkbox" className="hidden" checked={platforms.includes(p.value)} onChange={() => togglePlatform(p.value)} />
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          {/* Section: Type & Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Content Type</Label>
              <select
                value={contentType}
                onChange={e => setContentType(e.target.value as ContentItem['content_type'])}
                className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400"
              >
                {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Design Date</Label>
              <Input type="date" value={designDate} onChange={e => setDesignDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Publish Date/Time</Label>
              <Input type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400"
              >
                <option value="">Unassigned</option>
                {profilesList.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          </div>

          {/* Section: Status Triple */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Design Status</Label>
              <select
                value={designStatus}
                onChange={e => setDesignStatus(e.target.value)}
                className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md bg-white"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Internal Review</Label>
              <select
                value={internalReview}
                onChange={e => setInternalReview(e.target.value)}
                className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md bg-white"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="changes_required">Changes Required</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {(canApprove || !isNew) && (
              <div className="space-y-1.5">
                <Label className="text-xs">Client Approval</Label>
                <select
                  value={clientApproval}
                  onChange={e => setClientApproval(e.target.value)}
                  className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="changes_required">Changes Required</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}
          </div>

          {/* Section: Links */}
          <div className="space-y-1.5">
            <Label>Reference Link</Label>
            <Input
              type="url"
              value={referenceLink}
              onChange={e => setReferenceLink(e.target.value)}
              placeholder="https://… (for designers)"
            />
          </div>

          {platforms.length > 0 && (
            <div className="space-y-2">
              <Label>Live Links</Label>
              {platforms.map(p => {
                const platform = PLATFORMS.find(pl => pl.value === p)
                return (
                  <div key={p} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: platform?.color }} />
                    <label className="text-xs text-gray-500 w-20 shrink-0">{platform?.label}</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={liveLinks[p] ?? ''}
                      onChange={e => setLiveLinks(prev => ({ ...prev, [p]: e.target.value }))}
                      className="flex-1 h-8 px-2 text-xs border border-gray-200 rounded-md"
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Section: Caption/Copy */}
          <div className="space-y-1.5">
            <Label>Caption / Copy</Label>
            <Textarea rows={4} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write your caption or copy here…" />
          </div>

          {!canApprove && status === 'in_review' && (
            <div className="bg-amber-50 text-amber-700 text-xs rounded-lg px-3 py-2">
              This content needs approval from a Manager or Admin before it can be published.
            </div>
          )}

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
              <strong>Save failed:</strong> {saveError}
              {saveError.includes('column') && (
                <div className="mt-1 text-red-600">
                  Run migration 005 in Supabase SQL Editor to add the missing columns.
                </div>
              )}
            </div>
          )}

          {!isNew && item?.created_at && (
            <p className="text-xs text-gray-400">
              Created {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim() || (isNew && !clientId)}>
              {saving ? 'Saving…' : isNew ? 'Create' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
