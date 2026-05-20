import CampaignForm from '@/components/campaigns/CampaignForm'
import PageHeader from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'

export default async function NewCampaignPage() {
  const supabase = await createClient()
  const [{ data: clients }, { data: profiles }] = await Promise.all([
    supabase.from('clients').select('id,name').eq('status', 'active').order('name'),
    supabase.from('profiles').select('id,full_name').eq('is_active', true).order('full_name'),
  ])
  return (
    <div className="max-w-2xl mx-auto p-6">
      <PageHeader title="New Campaign" />
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <CampaignForm clients={clients ?? []} profiles={profiles ?? []} />
      </div>
    </div>
  )
}
