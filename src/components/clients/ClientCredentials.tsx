'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRole } from '@/context/RoleContext'

interface Credential {
  id: string
  client_id: string
  platform: string
  label: string | null
  url: string | null
  username: string | null
  password: string | null
  notes: string | null
  created_at: string
}

interface Props {
  clientId: string
  initialCredentials: Credential[]
  canEdit: boolean
}

const PLATFORM_OPTIONS = [
  { value: 'instagram',  label: 'Instagram',   abbr: 'IG', color: '#E1306C' },
  { value: 'facebook',   label: 'Facebook',    abbr: 'FB', color: '#1877F2' },
  { value: 'linkedin',   label: 'LinkedIn',    abbr: 'LI', color: '#0A66C2' },
  { value: 'twitter',    label: 'Twitter / X', abbr: 'X',  color: '#000000' },
  { value: 'youtube',    label: 'YouTube',     abbr: 'YT', color: '#FF0000' },
  { value: 'tiktok',     label: 'TikTok',      abbr: 'TT', color: '#69C9D0' },
  { value: 'google_ads', label: 'Google Ads',  abbr: 'GA', color: '#4285F4' },
  { value: 'email',      label: 'Email',       abbr: '@',  color: '#6b7280' },
  { value: 'website',    label: 'Website',     abbr: 'W',  color: '#7c3aed' },
  { value: 'other',      label: 'Other',       abbr: '•',  color: '#9ca3af' },
]

const EMPTY_FORM = { platform: 'instagram', label: '', url: '', username: '', password: '', notes: '' }

export default function ClientCredentials({ clientId, initialCredentials, canEdit }: Props) {
  const [creds, setCreds] = useState<Credential[]>(initialCredentials)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { isAdmin, isManager } = useRole()

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openAdd = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (c: Credential) => {
    setEditId(c.id)
    setForm({
      platform: c.platform,
      label: c.label ?? '',
      url: c.url ?? '',
      username: c.username ?? '',
      password: c.password ?? '',
      notes: c.notes ?? '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      client_id: clientId,
      platform: form.platform,
      label: form.label || null,
      url: form.url || null,
      username: form.username || null,
      password: form.password || null,
      notes: form.notes || null,
    }

    if (editId) {
      const { data } = await db
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editId)
        .select()
        .single()
      if (data) setCreds(prev => prev.map(c => c.id === editId ? data as unknown as Credential : c))
    } else {
      const { data } = await db
        .insert(payload)
        .select()
        .single()
      if (data) setCreds(prev => [...prev, data as unknown as Credential])
    }

    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this credential?')) return
    await db.delete().eq('id', id)
    setCreds(prev => prev.filter(c => c.id !== id))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase.from('client_credentials' as any)

  const getPlatformMeta = (val: string) => PLATFORM_OPTIONS.find(p => p.value === val) ?? PLATFORM_OPTIONS[PLATFORM_OPTIONS.length - 1]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Client Logins & Access</h3>
          <p className="text-xs text-gray-400 mt-0.5">Social media accounts, ad accounts, and other credentials shared by the client</p>
        </div>
        {canEdit && (
          <Button size="sm" className="gap-1.5" onClick={openAdd}>
            <Plus size={13} /> Add Login
          </Button>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-800">{editId ? 'Edit Credential' : 'Add New Login'}</h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Platform *</Label>
              <select
                value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400"
              >
                {PLATFORM_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Label (optional)</Label>
              <Input
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Main Account, Ad Account"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Username / Email</Label>
              <Input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="username or email"
                className="h-9 text-sm"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input
                type="text"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="password"
                className="h-9 text-sm font-mono"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">URL / Profile Link</Label>
              <Input
                type="url"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://…"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Notes</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any extra info (2FA, account manager, etc.)"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditId(null) }}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editId ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* Credentials list */}
      {creds.length === 0 && !showForm ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          No logins saved yet
          {canEdit && <span> — click <strong>Add Login</strong> to get started</span>}
        </div>
      ) : (
        <div className="space-y-2">
          {creds.map(c => {
            const meta = getPlatformMeta(c.platform)
            const revealed = revealedIds.has(c.id)
            return (
              <div key={c.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 group hover:border-gray-200 transition-colors">
                {/* Platform badge */}
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
                  style={{ backgroundColor: meta.color }}>
                  {meta.abbr}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{meta.label}</span>
                    {c.label && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{c.label}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                    {c.username && <span className="font-mono">{c.username}</span>}
                    {c.password && (
                      <button
                        onClick={() => toggleReveal(c.id)}
                        className="flex items-center gap-1 hover:text-gray-800 transition-colors"
                      >
                        {revealed ? (
                          <><EyeOff size={11} /><span className="font-mono">{c.password}</span></>
                        ) : (
                          <><Eye size={11} /><span>Show password</span></>
                        )}
                      </button>
                    )}
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noopener noreferrer"
                        className="text-violet-600 hover:underline truncate max-w-[200px]">
                        {c.url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {c.notes && <span className="text-gray-400 italic">{c.notes}</span>}
                  </div>
                </div>

                {/* Actions */}
                {canEdit && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                      <Pencil size={13} />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
