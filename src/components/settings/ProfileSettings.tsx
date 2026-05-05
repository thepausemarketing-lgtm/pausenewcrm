'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types/database.types'
import { useRouter } from 'next/navigation'

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'Europe/Paris',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'UTC',
]

export default function ProfileSettings({ profile, email }: { profile: Profile; email: string }) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [timezone, setTimezone] = useState(profile.timezone)
  const [newPassword, setNewPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleSave = async () => {
    setError(null)
    const { error } = await supabase.from('profiles').update({ full_name: fullName, timezone }).eq('id', profile.id)
    if (error) { setError(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setError(error.message); return }
    setNewPassword('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-lg bg-gray-200 text-gray-600">
            {getInitials(profile.full_name || email)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium text-gray-900">{profile.full_name || email}</p>
          <p className="text-xs text-gray-400 capitalize">{profile.role}</p>
        </div>
      </div>

      {/* Name & Timezone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Full Name</Label>
          <Input value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={email} disabled className="bg-gray-50 text-gray-500" />
        </div>
        <div className="space-y-1.5">
          <Label>Timezone</Label>
          <Select value={timezone} onValueChange={(v) => v !== null && setTimezone(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Saved successfully!</p>}

      <Button onClick={handleSave} size="sm">Save Profile</Button>

      {/* Password */}
      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Change Password</h4>
        <div className="flex gap-3 max-w-sm">
          <Input
            type="password"
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <Button onClick={handlePasswordChange} variant="outline" size="sm" disabled={newPassword.length < 8}>
            Update
          </Button>
        </div>
      </div>
    </div>
  )
}
