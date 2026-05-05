'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CAMPAIGN_STATUSES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import type { Campaign } from '@/types/database.types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  client_id: z.string().min(1, 'Client is required'),
  type: z.enum(['launch', 'seasonal', 'always_on', 'event', 'other']),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.string().optional(),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  campaign?: Campaign
  clients: { id: string; name: string }[]
}

export default function CampaignForm({ campaign, clients }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: campaign?.name ?? '',
      client_id: campaign?.client_id ?? '',
      type: campaign?.type ?? 'other',
      status: campaign?.status ?? 'draft',
      start_date: campaign?.start_date ?? '',
      end_date: campaign?.end_date ?? '',
      budget: campaign?.budget?.toString() ?? '',
      description: campaign?.description ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      name: data.name,
      client_id: data.client_id,
      type: data.type,
      status: data.status,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      budget: data.budget ? parseFloat(data.budget) : null,
      description: data.description || null,
    }

    if (campaign) {
      const { error } = await supabase.from('campaigns').update(payload).eq('id', campaign.id)
      if (error) { setError(error.message); return }
      router.push(`/app/campaigns/${campaign.id}`)
    } else {
      const { data: newCampaign, error } = await supabase
        .from('campaigns')
        .insert({ ...payload, created_by: user.id })
        .select()
        .single()
      if (error) { setError(error.message); return }
      await supabase.from('activity_logs').insert({
        actor_id: user.id, action: 'created_campaign', entity_type: 'campaign', entity_id: newCampaign.id,
      })
      router.push(`/app/campaigns/${newCampaign.id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Campaign Name *</Label>
          <Input placeholder="Summer Product Launch" {...register('name')} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Client *</Label>
          <select
            defaultValue={campaign?.client_id ?? ''}
            onChange={e => setValue('client_id', e.target.value)}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400"
          >
            <option value="">Select client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.client_id && <p className="text-xs text-red-500">{errors.client_id.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select defaultValue={campaign?.type ?? 'other'} onValueChange={v => setValue('type', v as FormData['type'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="launch">Launch</SelectItem>
              <SelectItem value="seasonal">Seasonal</SelectItem>
              <SelectItem value="always_on">Always On</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select defaultValue={campaign?.status ?? 'draft'} onValueChange={v => setValue('status', v as FormData['status'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CAMPAIGN_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Start Date</Label>
          <Input type="date" {...register('start_date')} />
        </div>

        <div className="space-y-1.5">
          <Label>End Date</Label>
          <Input type="date" {...register('end_date')} />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Budget (₹)</Label>
          <Input type="number" placeholder="100000" {...register('budget')} />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Description</Label>
          <Textarea rows={3} placeholder="Campaign objectives and details…" {...register('description')} />
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : campaign ? 'Update Campaign' : 'Create Campaign'}
        </Button>
      </div>
    </form>
  )
}
