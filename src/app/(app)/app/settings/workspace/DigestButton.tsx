'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

export default function DigestButton() {
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/daily-digest', { method: 'POST' })
      const json = await res.json()
      if (json.ok) {
        toast.success(`Digest sent to ${json.sent} team member${json.sent !== 1 ? 's' : ''}`)
      } else {
        toast.error('Failed to send digest')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setLoading(false)
  }

  return (
    <Button onClick={handleSend} disabled={loading} variant="outline" className="gap-2">
      <Send size={14} />
      {loading ? 'Sending…' : 'Send Digest Now'}
    </Button>
  )
}
