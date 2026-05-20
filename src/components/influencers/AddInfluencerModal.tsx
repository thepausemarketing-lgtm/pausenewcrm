'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { PLATFORMS } from '@/lib/constants'
import type { CampaignInfluencer } from './CampaignInfluencersSection'

type Influencer = {
  id: string
  name: string
  handle: string | null
  platform: string
  followers: number | null
  engagement_rate: number | null
}

interface Props {
  campaignId: string
  currentUserId: string
  onClose: () => void
  onAdded: (ci: CampaignInfluencer) => void
}

const sel = 'w-full h-9 px-2.5 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400'

function fmtFollowers(n: number | null) {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

export default function AddInfluencerModal({ campaignId, currentUserId, onClose, onAdded }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<'search' | 'new'>('search')

  // Search tab
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Influencer[]>([])
  const [selected, setSelected] = useState<Influencer | null>(null)

  // New influencer tab
  const [newName, setNewName] = useState('')
  const [newHandle, setNewHandle] = useState('')
  const [newPlatform, setNewPlatform] = useState('instagram')
  const [newFollowers, setNewFollowers] = useState('')
  const [newEngagement, setNewEngagement] = useState('')
  const [newCategory, setNewCategory] = useState('')

  // Shared deal fields
  const [dealType, setDealType] = useState<'barter' | 'paid'>('barter')
  const [amount, setAmount] = useState('')
  const [postUrl, setPostUrl] = useState('')

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const run = async () => {
      const { data } = await (supabase as any)
        .from('influencers')
        .select('id,name,handle,platform,followers,engagement_rate')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(30)
      setResults(data ?? [])
    }
    run()
  }, [query])

  const addToCampaign = async (influencerId: string) => {
    setLoading(true)
    const { data, error } = await (supabase as any)
      .from('campaign_influencers')
      .insert({
        campaign_id: campaignId,
        influencer_id: influencerId,
        deal_type: dealType,
        amount: dealType === 'paid' && amount ? parseFloat(amount) : null,
        post_url: postUrl || null,
        added_by: currentUserId,
      })
      .select('*, influencer:influencers(name,handle,platform,followers,engagement_rate)')
      .single()

    if (error) {
      toast.error(error.message.includes('unique') ? 'Already in this campaign' : 'Something went wrong')
      setLoading(false)
      return
    }
    toast.success('Influencer added')
    onAdded(data as CampaignInfluencer)
    onClose()
    setLoading(false)
  }

  const createAndAdd = async () => {
    if (!newName.trim()) return
    setLoading(true)

    const { data: inf, error } = await (supabase as any)
      .from('influencers')
      .insert({
        name: newName.trim(),
        handle: newHandle.replace(/^@/, '') || null,
        platform: newPlatform,
        followers: newFollowers ? parseInt(newFollowers) : null,
        engagement_rate: newEngagement ? parseFloat(newEngagement) : null,
        category: newCategory || null,
        created_by: currentUserId,
      })
      .select()
      .single()

    if (error) { toast.error('Failed to create influencer'); setLoading(false); return }
    await addToCampaign(inf.id)
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Influencer to Campaign</DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {(['search', 'new'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'search' ? 'Search Existing' : 'Create New'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {tab === 'search' ? (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name…"
                  className="pl-8"
                  autoFocus
                />
              </div>
              <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 max-h-52 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-5">
                    {query ? 'No matches — try "Create New"' : 'Start typing to search'}
                  </p>
                ) : results.map(inf => (
                  <button
                    key={inf.id}
                    onClick={() => setSelected(selected?.id === inf.id ? null : inf)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                      selected?.id === inf.id ? 'bg-violet-50' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inf.name}</p>
                      <p className="text-xs text-gray-400">
                        {inf.handle ? `@${inf.handle} · ` : ''}
                        <span className="capitalize">{inf.platform}</span>
                        {inf.followers ? ` · ${fmtFollowers(inf.followers)}` : ''}
                        {inf.engagement_rate ? ` · ${inf.engagement_rate}% ER` : ''}
                      </p>
                    </div>
                    {selected?.id === inf.id && (
                      <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Name *</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Rahul Sharma" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Handle</Label>
                <Input value={newHandle} onChange={e => setNewHandle(e.target.value)} placeholder="@rahul_sharma" />
              </div>
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className={sel}>
                  {PLATFORMS.filter(p => !['email', 'blog', 'google_ads'].includes(p.value)).map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Followers</Label>
                <Input type="number" value={newFollowers} onChange={e => setNewFollowers(e.target.value)} placeholder="180000" />
              </div>
              <div className="space-y-1.5">
                <Label>Engagement Rate (%)</Label>
                <Input type="number" step="0.1" value={newEngagement} onChange={e => setNewEngagement(e.target.value)} placeholder="3.5" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Category (optional)</Label>
                <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Fashion, Food, Tech…" />
              </div>
            </div>
          )}

          {/* Deal fields — always visible */}
          <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Deal Type</Label>
              <select value={dealType} onChange={e => setDealType(e.target.value as 'barter' | 'paid')} className={sel}>
                <option value="barter">Barter</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            {dealType === 'paid' && (
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="8000" />
              </div>
            )}
            <div className="space-y-1.5 col-span-2">
              <Label>Post URL <span className="text-gray-400 font-normal">(optional, add later)</span></Label>
              <Input value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://instagram.com/p/…" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {tab === 'search' ? (
            <Button onClick={() => selected && addToCampaign(selected.id)} disabled={!selected || loading}>
              {loading ? 'Adding…' : 'Add to Campaign'}
            </Button>
          ) : (
            <Button onClick={createAndAdd} disabled={!newName.trim() || loading}>
              {loading ? 'Creating…' : 'Create & Add'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
