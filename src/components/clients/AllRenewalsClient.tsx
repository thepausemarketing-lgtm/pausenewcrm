'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { formatCurrency } from '@/lib/utils'
import type { ServiceRenewal } from './ClientRenewals'

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

const BILLING_CYCLES: Record<string, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly',
  half_yearly: 'Half-Yearly', yearly: 'Yearly', one_time: 'One-time',
}

type RenewalWithClient = ServiceRenewal & {
  client: { id: string; name: string; slug: string } | null
}

interface Props {
  renewals: RenewalWithClient[]
  clients: { id: string; name: string }[]
  canEdit: boolean
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

function UrgencyBadge({ days }: { days: number }) {
  if (days < 0) return <span className="flex items-center gap-1 text-xs font-semibold text-red-600"><AlertTriangle size={11} /> {Math.abs(days)}d overdue</span>
  if (days === 0) return <span className="text-xs font-semibold text-red-600">Due today</span>
  if (days <= 7)  return <span className="flex items-center gap-1 text-xs font-semibold text-red-500"><Clock size={11} /> {days}d left</span>
  if (days <= 30) return <span className="flex items-center gap-1 text-xs font-semibold text-orange-500"><Clock size={11} /> {days}d left</span>
  if (days <= 60) return <span className="text-xs text-amber-500">{days}d left</span>
  return <span className="text-xs text-gray-400">{days}d</span>
}

function rowBg(days: number, status: string) {
  if (status !== 'active') return ''
  if (days < 0 || days <= 7) return 'bg-red-50'
  if (days <= 30) return 'bg-orange-50'
  return ''
}

type ViewFilter = 'upcoming' | 'overdue' | 'all'

export default function AllRenewalsClient({ renewals, clients, canEdit }: Props) {
  const [clientFilter, setClientFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [viewFilter, setViewFilter] = useState<ViewFilter>('upcoming')

  const filtered = useMemo(() => {
    return renewals.filter(r => {
      if (clientFilter && r.client_id !== clientFilter) return false
      if (categoryFilter && r.category !== categoryFilter) return false
      const days = daysUntil(r.renewal_date)
      if (viewFilter === 'overdue') return r.status === 'active' && days < 0
      if (viewFilter === 'upcoming') return r.status === 'active' && days >= 0
      return true
    })
  }, [renewals, clientFilter, categoryFilter, viewFilter])

  const overdueCnt = renewals.filter(r => r.status === 'active' && daysUntil(r.renewal_date) < 0).length
  const within30 = renewals.filter(r => {
    const d = daysUntil(r.renewal_date)
    return r.status === 'active' && d >= 0 && d <= 30
  }).length

  return (
    <div className="max-w-7xl mx-auto p-6">
      <PageHeader
        title="Service Renewals"
        description="All upcoming renewals across clients"
      />

      {/* Summary strip */}
      {(overdueCnt > 0 || within30 > 0) && (
        <div className="flex gap-3 mb-5">
          {overdueCnt > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <AlertTriangle size={14} className="text-red-600" />
              <span className="text-sm font-semibold text-red-700">{overdueCnt} overdue</span>
            </div>
          )}
          {within30 > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
              <Clock size={14} className="text-orange-600" />
              <span className="text-sm font-semibold text-orange-700">{within30} renewing within 30 days</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(['upcoming', 'overdue', 'all'] as ViewFilter[]).map(v => (
          <button key={v} onClick={() => setViewFilter(v)}
            className="px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all capitalize"
            style={viewFilter === v
              ? { backgroundColor: '#ede9fe', borderColor: '#7c3aed', color: '#6d28d9' }
              : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#6b7280' }
            }
          >
            {v === 'upcoming' ? 'Upcoming' : v === 'overdue' ? `Overdue${overdueCnt > 0 ? ` (${overdueCnt})` : ''}` : 'All'}
          </button>
        ))}

        <div className="ml-auto flex gap-2">
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
            className="h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none">
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none">
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          {viewFilter === 'overdue' ? '🎉 No overdue renewals' : 'No renewals match this filter'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Service</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Cost</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Cycle</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Renewal Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => {
                const days = daysUntil(r.renewal_date)
                const cat = CATEGORIES.find(c => c.value === r.category) ?? CATEGORIES[CATEGORIES.length - 1]
                return (
                  <tr key={r.id} className={`group ${rowBg(days, r.status)}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-gray-900">
                        {r.service_name}
                        {r.auto_renew && <span title="Auto-renews"><RefreshCw size={11} className="text-gray-400" /></span>}
                      </div>
                      {r.vendor && <p className="text-xs text-gray-400">{r.vendor}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {r.client ? (
                        <Link href={`/app/clients/${r.client.slug}/renewals`}
                          className="text-gray-600 hover:text-violet-600 hover:underline text-sm">
                          {r.client.name}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: cat.color + '18', color: cat.color }}>
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {r.cost ? formatCurrency(r.cost, r.currency) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{BILLING_CYCLES[r.billing_cycle] ?? r.billing_cycle}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(r.renewal_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3"><UrgencyBadge days={days} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            {filtered.length} service{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
