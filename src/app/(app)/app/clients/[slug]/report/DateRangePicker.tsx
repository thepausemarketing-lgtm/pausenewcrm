'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  slug: string
  defaultFrom: string
  defaultTo: string
}

export default function DateRangePicker({ slug, defaultFrom, defaultTo }: Props) {
  const router = useRouter()
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  const inputClass =
    'border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500'

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/app/clients/${slug}/report?from=${from}&to=${to}`)
  }

  return (
    <form onSubmit={handleApply} className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-gray-700">From</span>
      <input
        type="date"
        value={from}
        onChange={e => setFrom(e.target.value)}
        className={inputClass}
        max={to}
      />
      <span className="text-sm font-medium text-gray-700">To</span>
      <input
        type="date"
        value={to}
        onChange={e => setTo(e.target.value)}
        className={inputClass}
        min={from}
      />
      <button
        type="submit"
        className="px-3 py-1.5 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
      >
        Apply
      </button>
    </form>
  )
}
