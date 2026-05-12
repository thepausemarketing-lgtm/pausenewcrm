'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { slugify } from '@/lib/utils'
import { CLIENT_STATUSES, INDUSTRIES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Client } from '@/types/database.types'

const CURRENCIES = [
  { value: 'INR', label: '₹ INR — Indian Rupee' },
  { value: 'USD', label: '$ USD — US Dollar' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'GBP', label: '£ GBP — British Pound' },
  { value: 'EUR', label: '€ EUR — Euro' },
  { value: 'SGD', label: 'S$ SGD — Singapore Dollar' },
]

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  industry: z.string().optional(),
  status: z.enum(['prospect', 'active', 'paused', 'churned']),
  billing_type: z.enum(['retainer', 'project', 'hourly']),
  monthly_value: z.string().optional(),
  health_score: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().min(1, 'Currency is required'),
  parent_client_id: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  client?: Client
  allClients?: { id: string; name: string; parent_client_id: string | null }[]
  onSuccess?: () => void
}

export default function ClientForm({ client, allClients = [], onSuccess }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Only show top-level clients as parent options (not sub-brands themselves)
  const parentOptions = allClients.filter(c => !c.parent_client_id && c.id !== client?.id)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: client?.name ?? '',
      website: client?.website ?? '',
      industry: client?.industry ?? '',
      status: client?.status ?? 'prospect',
      billing_type: client?.billing_type ?? 'retainer',
      monthly_value: client?.monthly_value?.toString() ?? '',
      health_score: client?.health_score?.toString() ?? '',
      notes: client?.notes ?? '',
      currency: client?.currency ?? 'INR',
      parent_client_id: client?.parent_client_id ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      name: data.name,
      slug: slugify(data.name),
      website: data.website || null,
      industry: data.industry || null,
      status: data.status,
      billing_type: data.billing_type,
      monthly_value: data.monthly_value ? parseFloat(data.monthly_value) : null,
      health_score: data.health_score ? parseInt(data.health_score) : null,
      notes: data.notes || null,
      currency: data.currency || 'INR',
      parent_client_id: data.parent_client_id || null,
    }

    if (client) {
      const { error } = await supabase.from('clients').update(payload).eq('id', client.id)
      if (error) {
        // Slug conflict = another client with that name already exists
        if (error.message.includes('slug')) {
          setError(`A client with the name "${data.name}" already exists. Please use a different name.`)
        } else {
          setError(error.message)
        }
        return
      }
    } else {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({ ...payload, created_by: user.id })
        .select()
        .single()
      if (error) { setError(error.message); return }
      await supabase.from('activity_logs').insert({
        actor_id: user.id, action: 'created_client', entity_type: 'client', entity_id: newClient.id,
      })
    }

    toast.success('Client saved')
    if (onSuccess) onSuccess()
    else router.push(`/app/clients/${payload.slug}`)
    router.refresh()
  }

  const nativeSelectClass = 'w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-1.5 md:col-span-2">
          <Label>Client / Brand Name *</Label>
          <Input placeholder="Acme Corp" {...register('name')} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Part of a client group? (sub-brand) */}
        <div className="space-y-1.5 md:col-span-2">
          <Label>Part of Client Group (sub-brand)</Label>
          <select {...register('parent_client_id')} className={nativeSelectClass}>
            <option value="">— Independent client —</option>
            {parentOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <p className="text-xs text-gray-400">Leave blank if this is a top-level client. Select if this brand is managed under a parent client.</p>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select {...register('status')} className={nativeSelectClass}>
            {CLIENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Billing Type */}
        <div className="space-y-1.5">
          <Label>Billing Type</Label>
          <select {...register('billing_type')} className={nativeSelectClass}>
            <option value="retainer">Retainer</option>
            <option value="project">Project</option>
            <option value="hourly">Hourly</option>
          </select>
        </div>

        {/* Currency */}
        <div className="space-y-1.5">
          <Label>Currency</Label>
          <select {...register('currency')} className={nativeSelectClass}>
            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Monthly Value */}
        <div className="space-y-1.5">
          <Label>Monthly Value</Label>
          <Input type="number" placeholder="50000" {...register('monthly_value')} />
        </div>

        {/* Website */}
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Input placeholder="https://example.com" {...register('website')} />
          {errors.website && <p className="text-xs text-red-500">{errors.website.message}</p>}
        </div>

        {/* Industry */}
        <div className="space-y-1.5">
          <Label>Industry</Label>
          <select {...register('industry')} className={nativeSelectClass}>
            <option value="">Select industry</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        {/* Health Score */}
        <div className="space-y-1.5">
          <Label>Health Score (1–5)</Label>
          <select {...register('health_score')} className={nativeSelectClass}>
            <option value="">Rate health</option>
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n.toString()}>{n} — {['Very Poor', 'Poor', 'Neutral', 'Good', 'Excellent'][n - 1]}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5 md:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={3} placeholder="Internal notes about this client…" {...register('notes')} />
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : client ? 'Update Client' : 'Create Client'}
        </Button>
      </div>
    </form>
  )
}
