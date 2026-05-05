import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamManagement from '@/components/settings/TeamManagement'
import type { Designation } from '@/types/database.types'

export default async function TeamSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: rawMyProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const myProfile = rawMyProfile as { role: string } | null
  if (myProfile?.role !== 'admin') redirect('/app/settings/profile')

  const [{ data: profiles }, { data: rawDesignations }] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('designations').select('*').order('sort_order,name'),
  ])

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">Team Management</h3>
      <TeamManagement
        profiles={profiles ?? []}
        designations={(rawDesignations ?? []) as Designation[]}
        currentUserId={user.id}
      />
    </div>
  )
}
