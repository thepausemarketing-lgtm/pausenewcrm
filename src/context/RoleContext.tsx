'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database.types'

interface RoleContextValue {
  profile: Profile | null
  isAdmin: boolean
  isManager: boolean
  isMember: boolean
  canApproveContent: boolean
  canManageTeam: boolean
  loading: boolean
}

const RoleContext = createContext<RoleContextValue>({
  profile: null,
  isAdmin: false,
  isManager: false,
  isMember: false,
  canApproveContent: false,
  canManageTeam: false,
  loading: true,
})

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }

    fetchProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  const isAdmin = profile?.role === 'admin'
  const isManager = profile?.role === 'manager'
  const isMember = profile?.role === 'member'
  const canApproveContent = isAdmin || isManager
  const canManageTeam = isAdmin

  return (
    <RoleContext.Provider value={{
      profile, isAdmin, isManager, isMember,
      canApproveContent, canManageTeam, loading,
    }}>
      {children}
    </RoleContext.Provider>
  )
}

export const useRole = () => useContext(RoleContext)
