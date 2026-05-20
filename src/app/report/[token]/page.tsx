import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientReport from '@/components/reports/ClientReport'
import { fetchReportData } from '@/components/reports/fetchReportData'
import { createClient as createAdmin } from '@supabase/supabase-js'

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Use admin client to bypass RLS for token lookup
  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: tokenRow } = await db
    .from('report_tokens')
    .select('client_id, month, year, expires_at')
    .eq('token', token)
    .single()

  if (!tokenRow) notFound()
  if (new Date(tokenRow.expires_at) < new Date()) notFound()

  const data = await fetchReportData(db, tokenRow.client_id, tokenRow.month, tokenRow.year)
  if (!data) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8">
        <ClientReport data={data} branded />
      </div>
    </div>
  )
}
