'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PLATFORMS, CONTENT_TYPES, CONTENT_STATUSES } from '@/lib/constants'
import type { ContentItem } from '@/types/database.types'
import { useRole } from '@/context/RoleContext'

type ItemWithRelations = ContentItem & {
  client?: { name: string; slug: string; id: string } | null
}

interface Props {
  item: ItemWithRelations
  clients: { id: string; name: string }[]
  canApprove: boolean
}

const APPROVABLE_STATUSES = ['approved', 'scheduled', 'published']

export default function ContentItemEditClient({ item: initial, clients, canApprove }: Props) {
  const router = useRouter()
  const { profile } = useRole()
  const supabase = createClient()
  const [item, setItem] = useState(initial)
  const [saving, setSaving] = useState(false)

  const allowedStatuses = canApprove
    ? CONTENT_STATUSES
    : CONTENT_STATUSES.filter(s => !APPROVABLE_STATUSES.includes(s.value))

  const handleSave = async () => {
    setSaving(true)
    const clientId = (item.client as { id: string } | null)?.id ?? item.client_id
    await supabase.from('content_items').update({
      title: item.title,
      content_type: item.content_type,
      platform: item.platform,
      status: item.status,
      caption: item.caption,
      publish_at: item.publish_at,
      client_id: clientId,
    }).eq('id', item.id)
    if (profile) {
      await supabase.from('activity_logs').insert({
        actor_id: profile.id, action: 'updated_content', entity_type: 'content_item', entity_id: item.id,
      })
    }
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Edit Content</h3>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={item.title} onChange={e => setItem({ ...item, title: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select value={item.platform} onValueChange={v => setItem({ ...item, platform: v as ContentItem['platform'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={item.content_type} onValueChange={v => setItem({ ...item, content_type: v as ContentItem['content_type'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={item.status} onValueChange={v => setItem({ ...item, status: v as ContentItem['status'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{allowedStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Publish Date/Time</Label>
            <Input type="datetime-local"
              value={item.publish_at ? new Date(item.publish_at).toISOString().slice(0, 16) : ''}
              onChange={e => setItem({ ...item, publish_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Caption / Copy</Label>
          <Textarea rows={5} value={item.caption ?? ''} onChange={e => setItem({ ...item, caption: e.target.value })} />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
