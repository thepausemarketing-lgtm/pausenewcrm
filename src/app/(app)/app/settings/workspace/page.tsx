import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function WorkspaceSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: rawProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = rawProfile as { role: string } | null
  if (profile?.role !== 'admin') redirect('/app/settings/profile')

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">Workspace Settings</h3>
      <div className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Agency Name</label>
          <input
            defaultValue="Pause Marketing"
            className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Default Timezone</label>
          <select className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none">
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (ET)</option>
          </select>
        </div>
        <p className="text-xs text-gray-400">Additional workspace settings coming soon.</p>
      </div>
    </div>
  )
}
