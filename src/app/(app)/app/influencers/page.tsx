'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Search, Users } from 'lucide-react'
import { PLATFORMS } from '@/lib/constants'

type Influencer = {
  id: string
  name: string
  handle: string | null
  platform: string
  followers: number | null
  engagement_rate: number | null
  category: string | null
  campaign_count: number
}

function fmt(n: number | null) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

export default function InfluencersPage() {
  const supabase = createClient()
  const [all, setAll] = useState<Influencer[]>([])
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const { data } = await (supabase as any)
        .from('influencers')
        .select('id,name,handle,platform,followers,engagement_rate,category')
        .order('name')
      // Get campaign counts per influencer
      const { data: counts } = await (supabase as any)
        .from('campaign_influencers')
        .select('influencer_id')

      const countMap: Record<string, number> = {}
      ;(counts ?? []).forEach((r: { influencer_id: string }) => {
        countMap[r.influencer_id] = (countMap[r.influencer_id] ?? 0) + 1
      })

      setAll((data ?? []).map((i: Omit<Influencer, 'campaign_count'>) => ({
        ...i,
        campaign_count: countMap[i.id] ?? 0,
      })))
      setLoading(false)
    }
    run()
  }, [])

  const filtered = all.filter(i => {
    const matchQ = !query || i.name.toLowerCase().includes(query.toLowerCase()) ||
      (i.handle ?? '').toLowerCase().includes(query.toLowerCase())
    const matchP = !platform || i.platform === platform
    return matchQ && matchP
  })

  const platformColor = (p: string) => PLATFORMS.find(x => x.value === p)?.color ?? '#6B7280'

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Influencers</h1>
          <p className="text-sm text-gray-500 mt-0.5">All influencers across campaigns</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name or handle…"
            className="pl-8"
          />
        </div>
        <select
          value={platform}
          onChange={e => setPlatform(e.target.value)}
          className="h-9 px-2.5 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400"
        >
          <option value="">All platforms</option>
          {PLATFORMS.filter(p => !['email', 'blog', 'google_ads'].includes(p.value)).map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-500">No influencers found</p>
            <p className="text-xs text-gray-400 mt-1">Add influencers from within a campaign</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Followers</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ER %</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Campaigns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inf => (
                  <tr key={inf.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{inf.name}</p>
                      {inf.handle && <p className="text-xs text-gray-400">@{inf.handle}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: platformColor(inf.platform) }}
                        />
                        <span className="capitalize text-gray-700">{inf.platform}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{fmt(inf.followers)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {inf.engagement_rate != null ? `${inf.engagement_rate}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{inf.category ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        inf.campaign_count > 0 ? 'bg-violet-50 text-violet-700' : 'text-gray-400'
                      }`}>
                        {inf.campaign_count > 0 ? `${inf.campaign_count} campaign${inf.campaign_count > 1 ? 's' : ''}` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
