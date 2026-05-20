import type { ReportData } from './ClientReport'

// Works with both server and browser Supabase clients
export async function fetchReportData(
  supabase: any,
  clientId: string,
  month: number,
  year: number
): Promise<ReportData | null> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10) // last day of month

  const [clientRes, tasksRes, contentRes, campaignsRes, influencersRes, socialInsightsRes] = await Promise.all([
    supabase.from('clients').select('name,logo_url,industry,website,monthly_value,currency').eq('id', clientId).single(),
    supabase.from('tasks').select('id,status,due_date').eq('client_id', clientId),
    supabase.from('content_items').select('id,status,platform').eq('client_id', clientId)
      .gte('publish_at', startDate).lte('publish_at', endDate + 'T23:59:59'),
    supabase.from('campaigns').select('id,name,status,type').eq('client_id', clientId).not('status', 'eq', 'cancelled'),
    supabase.from('campaign_influencers')
      .select('id, post_url, campaign:campaigns!inner(client_id)')
      .eq('campaign.client_id', clientId),
    // Fetch social insights for the month
    supabase
      .from('social_insights')
      .select('*')
      .eq('client_id', clientId)
      .eq('month', month)
      .eq('year', year),
  ])

  if (!clientRes.data) return null

  const tasks = tasksRes.data ?? []
  const content = contentRes.data ?? []
  const campaigns = campaignsRes.data ?? []
  const ciRows = influencersRes.data ?? []
  const socialInsights = socialInsightsRes.data ?? []

  // Task stats
  const doneTasks = tasks.filter((t: any) => t.status === 'done').length
  const inProgressTasks = tasks.filter((t: any) => ['todo', 'in_progress', 'review'].includes(t.status)).length
  const overdueTasks = tasks.filter((t: any) =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
  ).length

  // Content by platform
  const platformMap: Record<string, { total: number; published: number }> = {}
  content.forEach((c: any) => {
    if (!platformMap[c.platform]) platformMap[c.platform] = { total: 0, published: 0 }
    platformMap[c.platform].total++
    if (c.status === 'published') platformMap[c.platform].published++
  })

  // Content by status
  const statusMap: Record<string, number> = {}
  content.forEach((c: any) => { statusMap[c.status] = (statusMap[c.status] ?? 0) + 1 })

  return {
    client: clientRes.data,
    month,
    year,
    tasks: {
      total: tasks.length,
      done: doneTasks,
      in_progress: inProgressTasks,
      overdue: overdueTasks,
    },
    content: {
      total: content.length,
      published: content.filter((c: any) => c.status === 'published').length,
      byPlatform: Object.entries(platformMap).map(([platform, v]) => ({ platform, ...v })),
      byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    },
    campaigns: campaigns.map((c: any) => ({ id: c.id, name: c.name, status: c.status, type: c.type })),
    influencers: {
      total: ciRows.length,
      posted: ciRows.filter((ci: any) => ci.post_url).length,
    },
    socialInsights,
  }
}
