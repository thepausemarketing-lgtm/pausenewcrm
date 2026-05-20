import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientReport from '@/components/reports/ClientReport'
import { fetchReportData } from '@/components/reports/fetchReportData'
import ShareReportButton from './ShareReportButton'

export default async function ClientReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('id').eq('slug', slug).single()
  if (!client) notFound()

  const now = new Date()
  const month = parseInt(sp.month ?? String(now.getMonth() + 1))
  const year = parseInt(sp.year ?? String(now.getFullYear()))

  const { data: { user } } = await supabase.auth.getUser()
  const data = await fetchReportData(supabase, client.id, month, year)
  if (!data) notFound()

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Build month options — last 12 months
  const monthOptions = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthOptions.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` })
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Period:</span>
          <div className="flex gap-1 flex-wrap">
            {monthOptions.map(opt => {
              const isActive = opt.month === month && opt.year === year
              return (
                <a
                  key={`${opt.month}-${opt.year}`}
                  href={`/app/clients/${slug}/report?month=${opt.month}&year=${opt.year}`}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    isActive
                      ? 'bg-violet-600 text-white font-medium'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </a>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareReportButton clientId={client.id} month={month} year={year} userId={user?.id ?? ''} />
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
