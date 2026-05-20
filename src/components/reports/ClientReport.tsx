import { PLATFORMS } from '@/lib/constants'

export type SocialInsightRow = {
  id: string
  connection_id: string
  client_id: string
  platform: string
  month: number
  year: number
  followers: number | null
  followers_gained: number | null
  reach: number | null
  impressions: number | null
  engagement: number | null
  posts_count: number | null
  ad_spend: number | null
  ad_clicks: number | null
  ad_impressions: number | null
  ad_conversions: number | null
  synced_at: string
}

export type ReportData = {
  client: {
    name: string
    logo_url: string | null
    industry: string | null
    website: string | null
    monthly_value: number | null
    currency: string | null
  }
  month: number
  year: number
  tasks: {
    total: number
    done: number
    in_progress: number
    overdue: number
  }
  content: {
    total: number
    published: number
    byPlatform: { platform: string; total: number; published: number }[]
    byStatus: { status: string; count: number }[]
  }
  campaigns: {
    id: string
    name: string
    status: string
    type: string
  }[]
  influencers: {
    total: number
    posted: number
  }
  socialInsights?: SocialInsightRow[]
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', in_review: 'In Review', approved: 'Approved',
  scheduled: 'Scheduled', published: 'Published',
}

const CAMPAIGN_STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  draft: 'bg-yellow-50 text-yellow-700',
  paused: 'bg-orange-50 text-orange-700',
  cancelled: 'bg-red-50 text-red-600',
}

interface Props {
  data: ReportData
  branded?: boolean
}

const PLATFORM_DISPLAY: Record<string, { label: string; color: string }> = {
  facebook_page: { label: 'Facebook Page', color: '#1877F2' },
  instagram:     { label: 'Instagram',      color: '#E1306C' },
  google_ads:    { label: 'Google Ads',     color: '#4285F4' },
  linkedin:      { label: 'LinkedIn',       color: '#0A66C2' },
  tiktok:        { label: 'TikTok',         color: '#010101' },
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function ClientReport({ data, branded = true }: Props) {
  const { client, month, year, tasks, content, campaigns, influencers, socialInsights } = data
  const monthName = MONTH_NAMES[month - 1]
  const completionRate = tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0
  const publishRate = content.total > 0 ? Math.round((content.published / content.total) * 100) : 0

  return (
    <div className="bg-white min-h-screen" id="report-root">
      {/* Header */}
      <div className="border-b border-gray-100 px-8 py-6">
        <div className="max-w-3xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-500 mt-0.5">Monthly Report — {monthName} {year}</p>
            {client.industry && <p className="text-sm text-gray-400 mt-0.5 capitalize">{client.industry}</p>}
          </div>
          {branded && (
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">Pause Marketing</p>
              <p className="text-xs text-gray-400 mt-0.5">Generated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tasks Completed', value: tasks.done, sub: `of ${tasks.total} total`, color: 'text-violet-600' },
            { label: 'Content Published', value: content.published, sub: `of ${content.total} total`, color: 'text-blue-600' },
            { label: 'Task Completion', value: `${completionRate}%`, sub: tasks.overdue > 0 ? `${tasks.overdue} overdue` : 'No overdue', color: completionRate >= 80 ? 'text-green-600' : 'text-amber-600' },
            { label: 'Influencers Posted', value: influencers.posted, sub: `of ${influencers.total} total`, color: 'text-pink-600' },
          ].map(kpi => (
            <div key={kpi.label} className="border border-gray-100 rounded-xl p-4">
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs font-medium text-gray-700 mt-1">{kpi.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Channel Insights */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Channel Insights</h2>
          {(!socialInsights || socialInsights.length === 0) ? (
            <div className="border border-dashed border-gray-200 rounded-xl py-6 text-center text-sm text-gray-400">
              No channel data synced for this month
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {socialInsights.map(row => {
                const display = PLATFORM_DISPLAY[row.platform] ?? { label: row.platform, color: '#6B7280' }
                const isAds = row.platform === 'google_ads'
                return (
                  <div key={row.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: display.color }}
                      />
                      <p className="text-sm font-semibold text-gray-800">{display.label}</p>
                      <p className="ml-auto text-xs text-gray-400">
                        {new Date(row.synced_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    {isAds ? (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Ad Spend',      value: row.ad_spend != null ? `$${row.ad_spend.toFixed(2)}` : '—' },
                          { label: 'Clicks',        value: fmtNum(row.ad_clicks) },
                          { label: 'Impressions',   value: fmtNum(row.ad_impressions) },
                          { label: 'Conversions',   value: fmtNum(row.ad_conversions) },
                        ].map(m => (
                          <div key={m.label} className="bg-gray-50 rounded-lg p-2.5">
                            <p className="text-lg font-bold text-gray-900">{m.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{m.label}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Followers',     value: fmtNum(row.followers) },
                          { label: 'Reach',         value: fmtNum(row.reach) },
                          { label: 'Impressions',   value: fmtNum(row.impressions) },
                          { label: 'Engagement',    value: fmtNum(row.engagement) },
                        ].map(m => (
                          <div key={m.label} className="bg-gray-50 rounded-lg p-2.5">
                            <p className="text-lg font-bold text-gray-900">{m.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{m.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Content by Platform */}
        {content.byPlatform.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Content by Platform</h2>
            <div className="space-y-3">
              {content.byPlatform.sort((a, b) => b.total - a.total).map(row => {
                const platform = PLATFORMS.find(p => p.value === row.platform)
                const pct = row.total > 0 ? (row.published / row.total) * 100 : 0
                return (
                  <div key={row.platform} className="flex items-center gap-4">
                    <div className="w-24 shrink-0">
                      <p className="text-sm text-gray-700">{platform?.label ?? row.platform}</p>
                    </div>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: platform?.color ?? '#6B7280' }}
                      />
                    </div>
                    <div className="w-28 text-right shrink-0">
                      <span className="text-sm font-medium text-gray-900">{row.published}</span>
                      <span className="text-xs text-gray-400"> / {row.total} published</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Content Status Breakdown */}
        {content.byStatus.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Content Status</h2>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {content.byStatus.map(row => (
                <div key={row.status} className="border border-gray-100 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{row.count}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{STATUS_LABEL[row.status] ?? row.status}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Tasks</h2>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-gray-100">
              {[
                { label: 'Total', value: tasks.total, color: 'text-gray-900' },
                { label: 'Completed', value: tasks.done, color: 'text-green-600' },
                { label: 'In Progress', value: tasks.in_progress, color: 'text-blue-600' },
                { label: 'Overdue', value: tasks.overdue, color: tasks.overdue > 0 ? 'text-red-600' : 'text-gray-400' },
              ].map(stat => (
                <div key={stat.label} className="p-4 text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
            {tasks.total > 0 && (
              <div className="border-t border-gray-100 px-4 py-2">
                <div className="flex rounded-full overflow-hidden h-2">
                  <div className="bg-green-400 transition-all" style={{ width: `${(tasks.done / tasks.total) * 100}%` }} />
                  <div className="bg-blue-400 transition-all" style={{ width: `${(tasks.in_progress / tasks.total) * 100}%` }} />
                  <div className="bg-gray-200 flex-1" />
                </div>
                <div className="flex gap-4 mt-1.5">
                  {[{ color: 'bg-green-400', label: 'Done' }, { color: 'bg-blue-400', label: 'In Progress' }, { color: 'bg-gray-200', label: 'Other' }].map(l => (
                    <span key={l.label} className="flex items-center gap-1 text-xs text-gray-400">
                      <span className={`w-2 h-2 rounded-full ${l.color}`} /> {l.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Campaigns */}
        {campaigns.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Campaigns ({campaigns.length})</h2>
            <div className="space-y-2">
              {campaigns.map(c => (
                <div key={c.id} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{c.type.replace('_', ' ')}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CAMPAIGN_STATUS_COLOR[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {branded && (
          <div className="border-t border-gray-100 pt-6 flex items-center justify-between text-xs text-gray-400">
            <span>Pause Marketing — Internal Report</span>
            <span>{monthName} {year}</span>
          </div>
        )}
      </div>
    </div>
  )
}
