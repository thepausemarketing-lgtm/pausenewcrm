'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Link2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  clientId: string
  month: number
  year: number
  userId: string
}

export default function ShareReportButton({ clientId, month, year, userId }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    setLoading(true)

    // Check for existing token for this client/month/year
    const { data: existing } = await (supabase as any)
      .from('report_tokens')
      .select('token')
      .eq('client_id', clientId)
      .eq('month', month)
      .eq('year', year)
      .gt('expires_at', new Date().toISOString())
      .single()

    let token = existing?.token

    if (!token) {
      const { data, error } = await (supabase as any)
        .from('report_tokens')
        .insert({ client_id: clientId, month, year, created_by: userId })
        .select('token')
        .single()
      if (error) { toast.error('Failed to generate link'); setLoading(false); return }
      token = data.token
    }

    const url = `${window.location.origin}/report/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Shareable link copied!')
    setTimeout(() => setCopied(false), 3000)
    setLoading(false)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare} disabled={loading} className="gap-1.5">
      {copied ? <Check size={13} className="text-green-600" /> : <Link2 size={13} />}
      {copied ? 'Copied!' : loading ? 'Generating…' : 'Share Link'}
    </Button>
  )
}
