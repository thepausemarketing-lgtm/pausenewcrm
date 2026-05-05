'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, Check, X, RefreshCw, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'

const CATEGORIES = [
  { value: 'domain',       label: 'Domain',          color: '#6366f1' },
  { value: 'hosting',      label: 'Hosting',          color: '#0891b2' },
  { value: 'whatsapp',     label: 'WhatsApp',         color: '#16a34a' },
  { value: 'ivr',          label: 'IVR',              color: '#d97706' },
  { value: 'email',        label: 'Email / SMTP',     color: '#7c3aed' },
  { value: 'software',     label: 'Software / SaaS',  color: '#db2777' },
  { value: 'crm',          label: 'CRM',              color: '#059669' },
  { value: 'analytics',    label: 'Analytics',        color: '#2563eb' },
  { value: 'advertising',  label: 'Ad Account',       color: '#ea580c' },
  { value: 'social_media', label: 'Social Media',     color: '#8b5cf6' },
  { value: 'other',        label: 'Other',            color: '#6b7280' },
]

const BILLING_CYCLES = [
  { value: 'monthly',     label: 'Monthly' },
  { value: 'quarterly',   label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'yearly',      label: 'Yearly' },
  { value: 'one_time',    label: 'One-time' },
]

const CURRENCIES = ['INR', 'USD', 'AED', 'GBP', 'EUR', 'SGD']

export interface ServiceRenewal {
  id: string
  client_id: string
  service_name: string
  vendor: string | null
  category: string
  cost: number | null
  currency: string
  billing_cycle: string
  renewal_date: string
  auto_renew: boolean
  notes: string | null
  status: string
  created_at: string
}

interface Props {
  renewals: ServiceRenewal[]
  clientId: string
  clientCurrency?: string
  canEdit: boolean
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

function RenewalUrgency({ days }: { days: number }) {
  if (days < 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
      <AlertTriangle size={11} /> Overdue {Math.abs(days)}d
    </span>
  )
  if (days === 0) return <span className="text-xs font-semibold text-red-600">Due today</span>
  if (days <= 7) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
      <Clock size={11} /> {days}d left
    </span>
  )
  if (days <= 30) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-orange-500">
      <Clock size={11} /> {days}d left
    </span>
  )
  if (days <= 60) return (
    <span className="flex items-center gap-1 text-xs text-amber-500">
      {days}d left
    </span>
  )
  return <span className="text-xs text-gray-400">{days}d left</span>
}

function rowBg(days: number, status: string) {
  if (status !== 'active') return ''
  if (days < 0) return 'bg-red-50'
  if (days <= 7) return 'bg-red-50'
  if (days <= 30) return 'bg-orange-50'
  return ''
}

const sel = 'h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400'

const BLANK = {
  service_name: '',
  vendor: '',
  category: 'domain',
  cost: '',
  currency: 'INR',
  billing_cycle: 'yearly',
  renewal_date: '',
  auto_renew: false,
  notes: '',
  status: 'active',
}

export default function ClientRenewals({ renewals: initial, clientId, clientCurrency = 'INR', canEdit }: Props) {
  const [renewals, setRenewals] = useState<ServiceRenewal[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...BLANK, currency: clientCurrency })
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<typeof BLANK & { currency: string }>({ ...BLANK })
  const [saving, setSaving] = useState(false)

  const db = (createClient() as any).from('service_renewals')

  const handleAdd = async () => {
    if (!form.service_name.trim() || !form.renewal_date) return
    setSaving(true)
    const { data } = await db.insert({
      client_id: clientId,
      service_name: form.service_name.trim(),
      vendor: form.vendor.trim() || null,
      category: form.category,
      cost: form.cost ? parseFloat(form.cost as string) : null,
      currency: form.currency,
      billing_cycle: form.billing_cycle,
      renewal_date: form.renewal_date,
      auto_renew: form.auto_renew,
      notes: form.notes.trim() || null,
      status: form.status,
    }).select().single()
    if (data) {
      setRenewals(prev => [...prev, data as ServiceRenewal].sort((a, b) => a.renewal_date.localeCompare(b.renewal_date)))
      setForm({ ...BLANK, currency: clientCurrency })
      setShowAdd(false)
    }
    setSaving(false)
  }

  const startEdit = (r: ServiceRenewal) => {
    setEditId(r.id)
    setEditForm({
      service_name: r.service_name,
      vendor: r.vendor ?? '',
      category: r.category,
      cost: r.cost?.toString() ?? '',
      currency: r.currency,
      billing_cycle: r.billing_cycle,
      renewal_date: r.renewal_date,
      auto_renew: r.auto_renew,
      notes: r.notes ?? '',
      status: r.status,
    })
  }

  const handleSaveEdit = async () => {
    if (!editId || !editForm.service_name.trim() || !editForm.renewal_date) return
    setSaving(true)
    const { data } = await db.update({
      service_name: editForm.service_name.trim(),
      vendor: editForm.vendor.trim() || null,
      category: editForm.category,
      cost: editForm.cost ? parseFloat(editForm.cost as string) : null,
      currency: editForm.currency,
      billing_cycle: editForm.billing_cycle,
      renewal_date: editForm.renewal_date,
      auto_renew: editForm.auto_renew,
      notes: editForm.notes.trim() || null,
      status: editForm.status,
    }).eq('id', editId).select().single()
    if (data) {
      setRenewals(prev => prev.map(r => r.id === editId ? data as ServiceRenewal : r).sort((a, b) => a.renewal_date.localeCompare(b.renewal_date)))
      setEditId(null)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this renewal?')) return
    await db.delete().eq('id', id)
    setRenewals(prev => prev.filter(r => r.id !== id))
  }

  const cat = (value: string) => CATEGORIES.find(c => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Service Renewals</h3>
          <p className="text-xs text-gray-400 mt-0.5">Track domains, hosting, WhatsApp, IVR and all subscriptions</p>
        </div>
        {canEdit && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(v => !v)}>
            <Plus size={13} /> Add Service
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">New Service</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Service Name *</Label>
              <Input placeholder="e.g. WhatsApp Business API" value={form.service_name}
                onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vendor</Label>
              <Input placeholder="e.g. Twilio, GoDaddy" value={form.vendor}
                onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={sel + ' w-full'}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Renewal Date *</Label>
              <div className="relative">
                <input type="text" readOnly placeholder="dd/mm/yyyy"
                  value={form.renewal_date ? `${form.renewal_date.slice(8,10)}/${form.renewal_date.slice(5,7)}/${form.renewal_date.slice(0,4)}` : ''}
                  className="w-full h-9 px-2.5 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none" />
                <input type="date" value={form.renewal_date}
                  onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cost</Label>
              <div className="flex gap-1.5">
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={sel}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Input type="number" placeholder="0" value={form.cost as string}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Billing Cycle</Label>
              <select value={form.billing_cycle} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))} className={sel + ' w-full'}>
                {BILLING_CYCLES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={sel + ' w-full'}>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="flex items-end pb-1 gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.auto_renew}
                  onChange={e => setForm(f => ({ ...f, auto_renew: e.target.checked }))}
                  className="accent-violet-600" />
                Auto-renews
              </label>
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea placeholder="Login details, notes on renewal process…" rows={2} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" disabled={!form.service_name.trim() || !form.renewal_date || saving}
              onClick={handleAdd}>{saving ? 'Adding…' : 'Add Service'}</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {renewals.length === 0 && !showAdd ? (
        <div className="text-center py-12 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          No services tracked yet. Add your first one above.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Service</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Cost</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Cycle</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Renewal Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                {canEdit && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {renewals.map(r => {
                const days = daysUntil(r.renewal_date)
                const c = cat(r.category)
                const cycle = BILLING_CYCLES.find(b => b.value === r.billing_cycle)

                if (editId === r.id) {
                  return (
                    <tr key={r.id} className="bg-violet-50">
                      <td className="px-3 py-2" colSpan={canEdit ? 8 : 7}>
                        <div className="grid grid-cols-4 gap-2">
                          <Input className="h-7 text-xs" placeholder="Service name" value={editForm.service_name}
                            onChange={e => setEditForm(f => ({ ...f, service_name: e.target.value }))} />
                          <Input className="h-7 text-xs" placeholder="Vendor" value={editForm.vendor}
                            onChange={e => setEditForm(f => ({ ...f, vendor: e.target.value }))} />
                          <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                            className="h-7 px-2 text-xs border border-gray-200 rounded-md bg-white">
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                          <div className="flex gap-1">
                            <select value={editForm.currency} onChange={e => setEditForm(f => ({ ...f, currency: e.target.value }))}
                              className="h-7 px-1.5 text-xs border border-gray-200 rounded-md bg-white w-16">
                              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <Input className="h-7 text-xs" type="number" placeholder="Cost" value={editForm.cost as string}
                              onChange={e => setEditForm(f => ({ ...f, cost: e.target.value }))} />
                          </div>
                          <select value={editForm.billing_cycle} onChange={e => setEditForm(f => ({ ...f, billing_cycle: e.target.value }))}
                            className="h-7 px-2 text-xs border border-gray-200 rounded-md bg-white">
                            {BILLING_CYCLES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                          </select>
                          <div className="relative w-32">
                            <input type="text" readOnly placeholder="dd/mm/yyyy"
                              value={editForm.renewal_date ? `${editForm.renewal_date.slice(8,10)}/${editForm.renewal_date.slice(5,7)}/${editForm.renewal_date.slice(0,4)}` : ''}
                              className="h-7 text-xs w-32 px-2 border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none" />
                            <input type="date" value={editForm.renewal_date}
                              onChange={e => setEditForm(f => ({ ...f, renewal_date: e.target.value }))}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                          </div>
                          <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                            className="h-7 px-2 text-xs border border-gray-200 rounded-md bg-white">
                            <option value="active">Active</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="expired">Expired</option>
                          </select>
                          <label className="flex items-center gap-1.5 text-xs text-gray-700">
                            <input type="checkbox" checked={editForm.auto_renew}
                              onChange={e => setEditForm(f => ({ ...f, auto_renew: e.target.checked }))}
                              className="accent-violet-600" /> Auto-renews
                          </label>
                          <div className="col-span-3 flex gap-1.5 justify-end items-center">
                            <button onClick={handleSaveEdit} className="p-1.5 rounded text-green-600 hover:bg-green-50">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditId(null)} className="p-1.5 rounded text-gray-400 hover:bg-gray-100">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={r.id} className={`group transition-colors ${rowBg(days, r.status)}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{r.service_name}</span>
                        {r.auto_renew && (
                          <span title="Auto-renews">
                            <RefreshCw size={11} className="text-gray-400" />
                          </span>
                        )}
                      </div>
                      {r.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{r.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: c.color + '18', color: c.color }}>
                        {c.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{r.vendor ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 text-sm font-medium">
                      {r.cost ? formatCurrency(r.cost, r.currency) : '—'}
                      {r.cost && <span className="text-xs text-gray-400 ml-1">/{cycle?.label.toLowerCase()}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">{cycle?.label ?? r.billing_cycle}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">
                        {new Date(r.renewal_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      {r.status === 'active' && <RenewalUrgency days={days} />}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'active' ? 'bg-green-50 text-green-700' :
                        r.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(r)}
                            className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDelete(r.id)}
                            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
