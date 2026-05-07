'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Profile, UserRole, Designation } from '@/types/database.types'
import { getInitials } from '@/lib/utils'
import { UserPlus, ChevronDown, ChevronRight, Users } from 'lucide-react'

const ROLE_COLORS: Record<UserRole, string> = {
  admin:   'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  member:  'bg-gray-100 text-gray-600',
}

const nativeSelect = 'h-8 px-2 text-xs border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400'

interface ProfileWithDesignation extends Profile {
  designation?: { name: string } | null
  reportsTo?: { full_name: string } | null
}

interface Props {
  profiles: ProfileWithDesignation[]
  designations: Designation[]
  currentUserId: string
  emailMap?: Record<string, string>
}

export default function TeamManagement({ profiles: initialProfiles, designations, currentUserId, emailMap = {} }: Props) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [createMode, setCreateMode] = useState<'invite' | 'create'>('invite')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [createFullName, setCreateFullName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<UserRole>('member')
  const [createDesignation, setCreateDesignation] = useState('')
  const [createReportsTo, setCreateReportsTo] = useState('')
  const [creating, setCreating] = useState(false)
  const [createSuccess, setCreateSuccess] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [expandedEdit, setExpandedEdit] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true); setInviteError(null)
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    if (!res.ok) {
      const d = await res.json()
      setInviteError(d.error ?? 'Failed to send invite')
    } else {
      setInviteSuccess(true); setInviteEmail('')
      setTimeout(() => setInviteSuccess(false), 3000)
    }
    setInviting(false)
  }

  const handleCreate = async () => {
    if (!createEmail.trim() || !createPassword.trim()) return
    setCreating(true); setCreateError(null)
    const res = await fetch('/api/create-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: createFullName, email: createEmail,
        password: createPassword, role: createRole,
        designation_id: createDesignation || null,
        reports_to: createReportsTo || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setCreateError(data.error ?? 'Failed to create member'); setCreating(false); return }
    setCreateSuccess(true)
    setCreateFullName(''); setCreateEmail(''); setCreatePassword('')
    setCreateRole('member'); setCreateDesignation(''); setCreateReportsTo('')
    setTimeout(() => setCreateSuccess(false), 3000)
    setCreating(false); router.refresh()
  }

  const handleUpdate = async (profileId: string, updates: Omit<Partial<Profile>, 'id' | 'created_at'>) => {
    await supabase.from('profiles').update(updates).eq('id', profileId)
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, ...updates } : p))
  }

  const handleToggleActive = async (profileId: string, currentActive: boolean) => {
    if (profileId === currentUserId) return
    await handleUpdate(profileId, { is_active: !currentActive })
  }

  // Build hierarchy tree
  const topLevel = profiles.filter(p => !p.reports_to || !profiles.find(x => x.id === p.reports_to))
  const getDirectReports = (id: string) => profiles.filter(p => p.reports_to === id)

  const renderProfile = (profile: ProfileWithDesignation, depth = 0, isLast = false) => {
    const directReports = getDirectReports(profile.id)
    const isExpanded = expandedEdit === profile.id
    const desig = designations.find(d => d.id === profile.designation_id)
    const reportsToProfile = profiles.find(p => p.id === profile.reports_to)
    const hasReports = directReports.length > 0

    return (
      <div key={profile.id} className="relative">
        {/* Tree connector lines */}
        {depth > 0 && (
          <>
            {/* Vertical line from parent */}
            <div
              className="absolute border-l-2 border-dashed border-gray-200"
              style={{ left: depth * 28 - 14, top: 0, bottom: isLast ? '50%' : 0 }}
            />
            {/* Horizontal connector to this node */}
            <div
              className="absolute border-t-2 border-dashed border-gray-200"
              style={{ left: depth * 28 - 14, top: 20, width: 14 }}
            />
          </>
        )}

        <div
          className={`relative flex items-center gap-3 p-3 rounded-xl border transition-colors ${profile.is_active ? 'border-gray-100 bg-white' : 'border-gray-50 bg-gray-50 opacity-60'}`}
          style={{ marginLeft: depth * 28 }}
        >
          {/* Avatar with report-count badge */}
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs bg-violet-100 text-violet-700 font-semibold">
                {getInitials(profile.full_name || '?')}
              </AvatarFallback>
            </Avatar>
            {hasReports && (
              <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {directReports.length}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-900 truncate">{profile.full_name || '(pending)'}</p>
              {desig && (
                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">{desig.name}</span>
              )}
            </div>
            {emailMap[profile.id] && (
              <p className="text-xs text-gray-400 mt-0.5">{emailMap[profile.id]}</p>
            )}
            {reportsToProfile && (
              <p className="text-xs text-gray-400 mt-0.5">
                Reports to <span className="text-gray-600 font-medium">{reportsToProfile.full_name}</span>
              </p>
            )}
            {hasReports && (
              <p className="text-xs text-violet-500 mt-0.5">
                {directReports.length} direct report{directReports.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[profile.role]}`}>
              {profile.role}{profile.id === currentUserId ? ' (you)' : ''}
            </span>

            {profile.id !== currentUserId && (
              <button
                onClick={() => setExpandedEdit(isExpanded ? null : profile.id)}
                className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5 transition-colors"
              >
                Edit {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}

            {profile.id !== currentUserId && (
              <button onClick={() => handleToggleActive(profile.id, profile.is_active)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                {profile.is_active ? 'Deactivate' : 'Activate'}
              </button>
            )}
          </div>
        </div>

        {/* Inline edit panel */}
        {isExpanded && (
          <div
            className="mt-1 mb-2 bg-gray-50 border border-gray-100 rounded-xl p-4 grid grid-cols-2 gap-3"
            style={{ marginLeft: depth * 28 + 32 }}
          >
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <select className={nativeSelect + ' w-full'}
                value={profile.role}
                onChange={e => handleUpdate(profile.id, { role: e.target.value as UserRole })}>
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Designation</Label>
              <select className={nativeSelect + ' w-full'}
                value={profile.designation_id ?? ''}
                onChange={e => handleUpdate(profile.id, { designation_id: e.target.value || null })}>
                <option value="">No designation</option>
                {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Reports To (who is their direct manager?)</Label>
              <select className={nativeSelect + ' w-full'}
                value={profile.reports_to ?? ''}
                onChange={e => handleUpdate(profile.id, { reports_to: e.target.value || null })}>
                <option value="">— Top of hierarchy (no one above them) —</option>
                {profiles.filter(p => p.id !== profile.id).map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                This person will be able to see all work assigned to their direct and indirect reports.
              </p>
            </div>
          </div>
        )}

        {/* Direct reports rendered below with increased depth */}
        {directReports.map((dr, i) => renderProfile(dr, depth + 1, i === directReports.length - 1))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add member section */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <UserPlus size={15} /> Add Team Member
        </h4>

        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-3">
          {(['invite', 'create'] as const).map(mode => (
            <button key={mode} onClick={() => setCreateMode(mode)}
              className={createMode === mode
                ? 'px-3 py-1.5 text-xs font-medium rounded-md bg-white shadow-sm text-gray-900'
                : 'px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700'}>
              {mode === 'invite' ? 'Send Invite' : 'Create Directly'}
            </button>
          ))}
        </div>

        {createMode === 'invite' ? (
          <>
            <div className="flex gap-3 flex-wrap">
              <Input type="email" placeholder="colleague@company.com" value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)} className="flex-1 min-w-[200px]" />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)}
                className="h-9 px-3 text-sm border border-gray-200 rounded-md bg-white">
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting} size="sm">
                {inviting ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
            {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
            {inviteSuccess && <p className="text-xs text-green-600">Invite sent!</p>}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Full Name</Label>
                <Input placeholder="Jane Smith" value={createFullName} onChange={e => setCreateFullName(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Email</Label>
                <Input type="email" placeholder="jane@company.com" value={createEmail} onChange={e => setCreateEmail(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Password</Label>
                <Input type="password" placeholder="Temporary password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Role</Label>
                <select value={createRole} onChange={e => setCreateRole(e.target.value as UserRole)}
                  className={nativeSelect + ' w-full'}>
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select></div>
              <div className="space-y-1"><Label className="text-xs">Designation</Label>
                <select value={createDesignation} onChange={e => setCreateDesignation(e.target.value)}
                  className={nativeSelect + ' w-full'}>
                  <option value="">No designation</option>
                  {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select></div>
              <div className="space-y-1"><Label className="text-xs">Reports To</Label>
                <select value={createReportsTo} onChange={e => setCreateReportsTo(e.target.value)}
                  className={nativeSelect + ' w-full'}>
                  <option value="">— Top of hierarchy —</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select></div>
            </div>
            <Button onClick={handleCreate} disabled={!createEmail.trim() || !createPassword.trim() || creating} size="sm">
              {creating ? 'Creating…' : 'Create Member'}
            </Button>
            {createError && <p className="text-xs text-red-600">{createError}</p>}
            {createSuccess && <p className="text-xs text-green-600">Member created!</p>}
          </>
        )}
      </div>

      {/* Team org chart */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Users size={12} /> Org Chart
          </p>
          <p className="text-xs text-gray-400">{profiles.length} member{profiles.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-4">
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-px border-t-2 border-dashed border-gray-300" />
              Reports to
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">2</div>
              Direct reports count
            </div>
          </div>

          <div className="space-y-2 overflow-x-auto">
            {topLevel.map((p, i) => renderProfile(p, 0, i === topLevel.length - 1))}
          </div>
        </div>
      </div>
    </div>
  )
}
