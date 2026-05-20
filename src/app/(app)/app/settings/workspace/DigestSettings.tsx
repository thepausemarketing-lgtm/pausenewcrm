'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const TIMEZONES = [
  { value: 'Asia/Kolkata',      label: 'IST — Asia/Kolkata (UTC+5:30)' },
  { value: 'UTC',               label: 'UTC' },
  { value: 'America/New_York',  label: 'ET — America/New_York (UTC-5/4)' },
  { value: 'America/Chicago',   label: 'CT — America/Chicago (UTC-6/5)' },
  { value: 'America/Los_Angeles', label: 'PT — America/Los_Angeles (UTC-8/7)' },
  { value: 'Europe/London',     label: 'GMT — Europe/London' },
  { value: 'Europe/Paris',      label: 'CET — Europe/Paris (UTC+1/2)' },
  { value: 'Asia/Dubai',        label: 'GST — Asia/Dubai (UTC+4)' },
  { value: 'Asia/Singapore',    label: 'SGT — Asia/Singapore (UTC+8)' },
]

const HOURS = Array.from({ length: 24 }, (_, h) => {
  const label = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`
  return { value: `${String(h).padStart(2, '0')}:00`, label }
})

const sel = 'w-full h-9 px-2.5 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400'

interface Props {
  initialTime: string
  initialTimezone: string
}

export default function DigestSettings({ initialTime, initialTimezone }: Props) {
  const supabase = createClient()
  const [time, setTime] = useState(initialTime)
  const [timezone, setTimezone] = useState(initialTimezone)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const { error } = await (supabase as any)
      .from('workspace_settings')
      .update({ digest_time: time, digest_timezone: timezone, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000') // update the single row
    if (error) {
      toast.error('Failed to save')
    } else {
      toast.success('Digest schedule updated')
    }
    setSaving(false)
  }

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">Time</label>
        <select value={time} onChange={e => setTime(e.target.value)} className={sel} style={{ width: 140 }}>
          {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5 flex-1 min-w-48">
        <label className="text-xs font-medium text-gray-600">Timezone</label>
        <select value={timezone} onChange={e => setTimezone(e.target.value)} className={sel}>
          {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
      </div>
      <Button onClick={save} disabled={saving} size="sm">
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  )
}
