import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientReport from '@/components/reports/ClientReport'
import { fetchReportData } from '@/components/reports/fetchReportData'
import ShareReportButton from './ShareReportButton'
import DateRangePicker from './DateRangePicker'

export default async function ClientReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('id').eq('slug', slug).single()
  if (!client) notFound()

  // Default: MTD (first day of current month to today) — computed server-side
  const now = new Date()
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const defaultTo = now.toISOString().slice(0, 10)

  const from = sp.from ?? defaultFrom
  const to = sp.to ?? defaultTo

  const { data: { user } } = await supabase.auth.getUser()
  const data = await fetchReportData(supabase, client.id, from, to)
  if (!data) notFound()

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4 flex-wrap">
        <DateRangePicker slug={slug} defaultFrom={from} defaultTo={to} />
        <div className="flex items-center gap-2">
          <ShareReportButton clientId={client.id} startDate={from} endDate={to} userId={user?.id ?? ''} />
          <button
            onClick={undefined}
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
            id="print-btn"
          >
            🖨 Print / PDF
          </button>
        </div>
      </div>

      {/* Report */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <ClientReport data={data} />
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `document.getElementById('print-btn')?.addEventListener('click', () => window.print())`
      }} />
    </div>
  )
}
