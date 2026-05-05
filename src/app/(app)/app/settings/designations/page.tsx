import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DesignationsManager from '@/components/settings/DesignationsManager'
import type { Designation } from '@/types/database.types'

export default async function DesignationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((myProfile as { role: string } | null)?.role !== 'admin') redirect('/app/settings/profile')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: designations } = await (supabase as any).from('designations').select('*').order('sort_order,name')

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <DesignationsManager initialDesignations={(designations ?? []) as Designation[]} />
    </div>
  )
}
