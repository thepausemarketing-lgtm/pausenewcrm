'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const requestSchema = z.object({ email: z.string().email() })
const resetSchema = z.object({
  password: z.string().min(8, 'At least 8 characters'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})

export default function ResetPasswordForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'request' | 'reset'>('request')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const requestForm = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
  })

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
  })

  const onRequest = async (data: z.infer<typeof requestSchema>) => {
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  const onReset = async (data: z.infer<typeof resetSchema>) => {
    setError(null)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) setError(error.message)
    else router.push('/app/dashboard')
  }

  if (sent) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-700">Check your email for a reset link.</p>
        <button onClick={() => setSent(false)} className="text-xs text-gray-500 underline">
          Send again
        </button>
      </div>
    )
  }

  if (mode === 'reset') {
    return (
      <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New Password</Label>
          <Input id="password" type="password" {...resetForm.register('password')} />
          {resetForm.formState.errors.password && (
            <p className="text-xs text-red-500">{resetForm.formState.errors.password.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm Password</Label>
          <Input id="confirm" type="password" {...resetForm.register('confirm')} />
          {resetForm.formState.errors.confirm && (
            <p className="text-xs text-red-500">{resetForm.formState.errors.confirm.message}</p>
          )}
        </div>
        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
        <Button type="submit" className="w-full" disabled={resetForm.formState.isSubmitting}>
          Update password
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={requestForm.handleSubmit(onRequest)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...requestForm.register('email')} />
        {requestForm.formState.errors.email && (
          <p className="text-xs text-red-500">{requestForm.formState.errors.email.message}</p>
        )}
      </div>
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
      <Button type="submit" className="w-full" disabled={requestForm.formState.isSubmitting}>
        Send reset link
      </Button>
    </form>
  )
}
