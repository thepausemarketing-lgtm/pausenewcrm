import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Paperclip } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import EmptyState from '@/components/shared/EmptyState'
import type { Attachment } from '@/types/database.types'

export default async function ClientFilesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: clientRow } = await supabase.from('clients').select('id').eq('slug', slug).single()
  const client = clientRow as { id: string } | null
  if (!client) notFound()

  const { data: rawFiles } = await supabase
    .from('attachments')
    .select('*, uploader:profiles!attachments_uploaded_by_fkey(full_name)')
    .eq('entity_type', 'client')
    .eq('entity_id', client.id)
    .order('created_at', { ascending: false })

  const files = (rawFiles ?? []) as (Attachment & { uploader?: { full_name: string } | null })[]

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">Files</h3>
      {!files.length ? (
        <EmptyState icon={Paperclip} title="No files yet" description="Files attached to this client will appear here" />
      ) : (
        <div className="space-y-2">
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100">
              <Paperclip size={16} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                <p className="text-xs text-gray-400">
                  {file.uploader?.full_name ?? 'Unknown'} · {formatDate(file.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
