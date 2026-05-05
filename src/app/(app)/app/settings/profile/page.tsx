import { createClient } from '@/lib/supabase/server'
import ProfileSettings from '@/components/settings/ProfileSettings'

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">My Profile</h3>
      <ProfileSettings profile={profile!} email={user.email!} />
    </div>
  )
}
