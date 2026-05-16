import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import CalendarView from '@/components/calendar/CalendarView'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const canApprove = rawProfile?.role === 'admin' || rawProfile?.role === 'manager'

  return (
    <div className="p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Suspense>
          <CalendarView
            canApprove={canApprove}
            currentUserId={user.id}
          />
        </Suspense>
      </div>
    </div>
  )
}
