import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DigestButton from './DigestButton'
import DigestSettings from './DigestSettings'
import NotificationHistory from './NotificationHistory'

export default async function WorkspaceSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: rawProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = rawProfile as { role: string } | null
  if (profile?.role !== 'admin') redirect('/app/settings/profile')

  const { data: wsSettings } = await (supabase as any)
    .from('workspace_settings')
    .select('digest_time, digest_timezone')
    .single()

  const digestTime: string = wsSettings?.digest_time ?? '19:00'
  const digestTimezone: string = wsSettings?.digest_timezone ?? 'Asia/Kolkata'

  return (
    <div className="space-y-5">
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
          <p className="text-xs text-gray-400">Additional workspace settings coming soon.</p>
        </div>
      </div>

      {/* Daily Digest */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Daily Digest</h3>
          <p className="text-sm text-gray-500">
            Sends a Telegram message to every team member with their pending tasks and content.
          </p>
        </div>

        {/* Time & timezone picker */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Schedule</p>
          <DigestSettings initialTime={digestTime} initialTimezone={digestTimezone} />
        </div>

        {/* Manual send */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Manual Send</p>
          <DigestButton />
        </div>
      </div>

      {/* Message History */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Message History</h3>
        <p className="text-sm text-gray-500 mb-4">Last 50 Telegram notifications sent from this workspace.</p>
        <NotificationHistory />
      </div>
    </div>
  )
}
