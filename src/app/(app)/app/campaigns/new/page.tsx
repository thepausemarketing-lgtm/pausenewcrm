import CampaignForm from '@/components/campaigns/CampaignForm'
import PageHeader from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'

export default async function NewCampaignPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('id,name').eq('status', 'active').order('name')
  return (
    <div className="max-w-2xl mx-auto p-6">
      <PageHeader title="New Campaign" />
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <CampaignForm clients={clients ?? []} />
      </div>
    </div>
  )
}
