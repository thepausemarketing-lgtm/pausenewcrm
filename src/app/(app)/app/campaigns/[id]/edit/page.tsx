import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CampaignForm from '@/components/campaigns/CampaignForm'
import PageHeader from '@/components/shared/PageHeader'

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: campaign }, { data: clients }, { data: profiles }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', id).single(),
    supabase.from('clients').select('id,name').eq('status', 'active').order('name'),
    supabase.from('profiles').select('id,full_name').eq('is_active', true).order('full_name'),
  ])
  if (!campaign) notFound()
  return (
    <div className="max-w-2xl mx-auto p-6">
      <PageHeader title="Edit Campaign" />
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <CampaignForm campaign={campaign} clients={clients ?? []} profiles={profiles ?? []} />
      </div>
    </div>
  )
}
