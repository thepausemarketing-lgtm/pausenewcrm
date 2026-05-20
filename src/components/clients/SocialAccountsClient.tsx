'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { RefreshCw, Trash2, Link2, Users, Eye, TrendingUp, MessageCircle, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  facebook:  '#1877F2',
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook:  'Facebook',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n/1_000).toFixed(1)}K`
  return String(n)
}

interface Props {
  client: { id: string; name: string; slug: string }
  accounts: any[]
  insightsMap: Record<string, { metrics: any; fetched_at: string }>
  currentUserId: string
  justConnected?: boolean
  connectError?: string
}

interface Page {
  id: string
  name: string
  picture: { data: { url: string } }
  access_token: string
  instagram_business_account?: { id: string }
}

export default function SocialAccountsClient({ client, accounts: initialAccounts, insightsMap: initialInsights, currentUserId, justConnected, connectError }: Props) {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const [accounts, setAccounts] = useState(initialAccounts)
  const [insightsMap, setInsightsMap] = useState(initialInsights)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [pages, setPages] = useState<Page[]>([])
  const [fetching, setFetching] = useState(false)

  const openModal = async () => {
    setShowModal(true)
    setPages([])
    setFetching(true)
    try {
      const res = await fetch('/api/meta/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setPages(json.pages)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch pages')
      setShowModal(false)
    }
    setFetching(false)
  }

  const fetchPages = async () => {
    setFetching(true)
    try {
      const res = await fetch('/api/meta/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // uses META_USER_ACCESS_TOKEN from server env
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setPages(json.pages)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch pages')
    }
    setFetching(false)
  }

  const connectPage = async (page: Page) => {
    await db.from('social_connections').upsert({
      client_id: client.id,
      platform: 'facebook_page',
      account_id: page.id,
      account_name: page.name,
      account_picture: page.picture?.data?.url ?? null,
      access_token: page.access_token,
    }, { onConflict: 'client_id,platform,account_id' })

    if (page.instagram_business_account?.id) {
      await db.from('social_connections').upsert({
        client_id: client.id,
        platform: 'instagram',
        account_id: page.instagram_business_account.id,
        account_name: `${page.name} (Instagram)`,
        account_picture: page.picture?.data?.url ?? null,
        access_token: page.access_token,
      }, { onConflict: 'client_id,platform,account_id' })
    }

    toast.success(`Connected ${page.name}`)
    setShowModal(false)
    setPages([])
    setToken('')
    window.location.reload()
  }

  const refreshInsights = async (accountId: string) => {
    setLoadingId(accountId)
    const res = await fetch('/api/social/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ socialAccountId: accountId }),
    })
    const data = await res.json()
    if (data.ok) {
      setInsightsMap(prev => ({
        ...prev,
        [accountId]: { metrics: data.metrics, fetched_at: new Date().toISOString() },
      }))
    }
    setLoadingId(null)
  }

  const disconnect = async (accountId: string, name: string) => {
    if (!confirm(`Disconnect ${name}?`)) return
    await fetch('/api/social/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ socialAccountId: accountId }),
    })
    setAccounts(prev => prev.filter(a => a.id !== accountId))
  }

  const igAccounts = accounts.filter(a => a.platform === 'instagram')
  const fbAccounts = accounts.filter(a => a.platform === 'facebook')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Connected Social Accounts</h3>
            <p className="text-xs text-gray-400 mt-0.5">Connect social accounts to fetch follower counts and engagement insights.</p>
          </div>
          <Button onClick={openModal} size="sm" className="gap-1.5">
            <Link2 size={13} /> Connect Meta (Instagram + Facebook)
          </Button>
        </div>

        {justConnected && (
          <div className="mt-3 bg-green-50 border border-green-100 text-green-700 text-xs rounded-lg px-3 py-2">
            ✅ Successfully connected! Click <strong>Refresh</strong> on each account to load insights.
          </div>
        )}
        {connectError && (
          <div className="mt-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg px-3 py-2">
            Connection failed: {connectError}
          </div>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Link2 size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">No accounts connected yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Connect Meta" above to link Instagram and Facebook pages.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map(account => {
            const color   = PLATFORM_COLORS[account.platform] ?? '#6b7280'
            const label   = PLATFORM_LABELS[account.platform] ?? account.platform
            const insight = insightsMap[account.id]
            const metrics = insight?.metrics ?? {}
            const loading = loadingId === account.id

            return (
              <div key={account.id} className="bg-white rounded-xl border border-gray-100 p-5">
                {/* Account Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={account.account_picture} />
                        <AvatarFallback style={{ backgroundColor: color + '20', color }} className="text-xs font-bold">
                          {label[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: color }}>
                        {label[0]}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{account.account_name}</p>
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {insight && (
                      <p className="text-xs text-gray-400">
                        Updated {new Date(insight.fetched_at).toLocaleDateString('en-GB')}
                      </p>
                    )}
                    <button
                      onClick={() => refreshInsights(account.id)}
                      disabled={loading}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                      {loading ? 'Fetching…' : 'Refresh'}
                    </button>
                    <button
                      onClick={() => disconnect(account.id, account.account_name)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1.5"
                      title="Disconnect"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Metrics */}
                {!insight ? (
                  <div className="bg-gray-50 rounded-lg p-4 text-center text-xs text-gray-400">
                    Click <strong>Refresh</strong> to load insights
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {account.platform === 'instagram' && (
                      <>
                        <MetricCard icon={Users}       label="Followers"       value={fmt(metrics.followers ?? 0)}      color={color} />
                        <MetricCard icon={Eye}         label="Reach (30d)"     value={fmt(metrics.reach_30d ?? 0)}      color={color} />
                        <MetricCard icon={TrendingUp}  label="Impressions"     value={fmt(metrics.impressions_30d ?? 0)} color={color} />
                        <MetricCard icon={MessageCircle} label="Posts"         value={fmt(metrics.media_count ?? 0)}    color={color} />
                      </>
                    )}
                    {account.platform === 'facebook' && (
                      <>
                        <MetricCard icon={Users}       label="Page Likes"      value={fmt(metrics.followers ?? 0)}      color={color} />
                        <MetricCard icon={Eye}         label="Reach (30d)"     value={fmt(metrics.reach_30d ?? 0)}      color={color} />
                        <MetricCard icon={TrendingUp}  label="Impressions"     value={fmt(metrics.impressions_30d ?? 0)} color={color} />
                        <MetricCard icon={Heart}       label="Engagement"      value={fmt(metrics.engagement_30d ?? 0)} color={color} />
                      </>
                    )}
                  </div>
                )}

                {/* Recent Posts — Instagram only */}
                {account.platform === 'instagram' && metrics.recent_posts?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recent Posts</p>
                    <div className="space-y-2">
                      {metrics.recent_posts.slice(0, 5).map((post: any) => (
                        <div key={post.id} className="flex items-center justify-between text-xs py-2 border-b border-gray-50">
                          <p className="text-gray-600 truncate max-w-[60%]">{post.caption || `[${post.type}]`}</p>
                          <div className="flex items-center gap-3 text-gray-400 shrink-0">
                            <span className="flex items-center gap-1"><Heart size={10} /> {fmt(post.likes)}</span>
                            <span className="flex items-center gap-1"><MessageCircle size={10} /> {fmt(post.comments)}</span>
                            <span className="flex items-center gap-1"><Eye size={10} /> {fmt(post.reach)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Page picker modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Select a Facebook Page</h3>
            <p className="text-xs text-gray-500 mb-4">Choose which page belongs to this client. Linked Instagram accounts connect automatically.</p>
            {fetching ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading pages…</div>
            ) : (
              <div className="space-y-2">
                {pages.map(page => (
                  <button key={page.id} onClick={() => connectPage(page)}
                    className="w-full flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-colors text-left">
                    {page.picture?.data?.url
                      ? <img src={page.picture.data.url} className="w-8 h-8 rounded-full" alt="" />
                      : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">f</div>
                    }
                    <div>
                      <div className="text-sm font-medium text-gray-800">{page.name}</div>
                      <div className="text-xs text-gray-400">{page.instagram_business_account ? '+ Instagram linked' : 'Facebook Page only'}</div>
                    </div>
                  </button>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => setShowModal(false)}>Cancel</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} style={{ color }} />
        <p className="text-xs text-gray-400">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
