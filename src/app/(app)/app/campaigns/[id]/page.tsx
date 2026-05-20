import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Campaign, Task, ContentItem } from '@/types/database.types'
import CampaignDetailClient from '@/components/campaigns/CampaignDetailClient'
import type { PipelineStep, CampaignInfluencer } from '@/components/influencers/CampaignInfluencersSection'

type CampaignWithRefs = Campaign & {
  client?: { name: string; slug: string } | null
}
type TaskWithAssignee = Task & { assignee?: { full_name: string } | null }

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawCampaign } = await supabase
    .from('campaigns')
    .select('*, client:clients(name,slug)')
    .eq('id', id)
    .single()

  const campaign = rawCampaign as CampaignWithRefs | null
  if (!campaign) notFound()

  const [
    { data: rawTasks },
    { data: rawContentItems },
    { data: rawProfiles },
    { data: rawClients },
    { data: rawAssignees },
    { data: rawSteps },
    { data: rawCampaignInfluencers },
    { data: { user } },
  ] = await Promise.all([
    supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(full_name)').eq('campaign_id', id).order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('content_items').select('*').eq('campaign_id', id).order('publish_at', { ascending: true }),
    supabase.from('profiles').select('id,full_name').eq('is_active', true).order('full_name'),
    supabase.from('clients').select('id,name,parent_client_id').not('status', 'eq', 'churned').order('name'),
    (supabase as any).from('campaign_assignees').select('user_id, profile:profiles(full_name, avatar_url)').eq('campaign_id', id),
    (supabase as any).from('campaign_pipeline_steps').select('*').eq('campaign_id', id).order('step_order'),
    (supabase as any).from('campaign_influencers').select('*, influencer:influencers(name,handle,platform,followers,engagement_rate), completions:influencer_step_completions(step_id)').eq('campaign_id', id).order('added_at'),
    supabase.auth.getUser(),
  ])

  const tasks = (rawTasks ?? []) as TaskWithAssignee[]
  const contentItems = (rawContentItems ?? []) as ContentItem[]
  const profiles = (rawProfiles ?? []) as { id: string; full_name: string }[]
  const clients = (rawClients ?? []) as { id: string; name: string; parent_client_id?: string | null }[]
  const assignees = (rawAssignees ?? []) as { user_id: string; profile: { full_name: string; avatar_url: string | null } }[]
  const pipelineSteps = (rawSteps ?? []) as PipelineStep[]
  const campaignInfluencers = (rawCampaignInfluencers ?? []) as CampaignInfluencer[]

  return (
    <CampaignDetailClient
      campaign={campaign}
      tasks={tasks}
      contentItems={contentItems}
      profiles={profiles}
      clients={clients}
      assignees={assignees}
      pipelineSteps={pipelineSteps}
      campaignInfluencers={campaignInfluencers}
      currentUserId={user?.id ?? ''}
    />
  )
}
