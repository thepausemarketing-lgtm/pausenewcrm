'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { CalendarDays, Repeat2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { PLATFORMS } from '@/lib/constants'
import type { ContentItem } from '@/types/database.types'

type ItemWithRelations = ContentItem & {
  client?: { name: string; slug: string; id: string } | null
  assignee?: { full_name: string; avatar_url: string | null } | null
}

interface Props {
  item: ItemWithRelations
  onClick: () => void
  isDragging?: boolean
}

export default function ContentKanbanCard({ item, onClick, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id })

  const style = { transform: CSS.Translate.toString(transform) }

  const platforms = item.platforms?.length
    ? item.platforms.slice(0, 3)
    : item.platform ? [item.platform] : []

  const publishDate = item.publish_at
    ? new Date(item.publish_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  const assignee = item.assignee as { full_name: string; avatar_url: string | null } | null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg border border-gray-100 p-3 cursor-grab active:cursor-grabbing hover:border-violet-200 hover:shadow-sm transition-all select-none',
        isDragging && 'opacity-40 shadow-xl rotate-1 border-violet-300',
      )}
    >
      {/* Platform dots */}
      {platforms.length > 0 && (
        <div className="flex gap-1 mb-2">
          {platforms.map(pv => {
            const pl = PLATFORMS.find(p => p.value === pv)
            return (
              <span key={pv} className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 rounded-full px-1.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pl?.color ?? '#9ca3af' }} />
                {pl?.label ?? pv}
              </span>
            )
          })}
          {item.platforms && item.platforms.length > 3 && (
            <span className="text-[10px] text-gray-400">+{item.platforms.length - 3}</span>
          )}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 mb-2">{item.title}</p>

      {/* Client */}
      {item.client && (
        <p className="text-xs text-gray-400 mb-2 truncate">{item.client.name}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {publishDate ? (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <CalendarDays size={10} />
            {publishDate}
          </span>
        ) : <span />}

        {assignee && (
          <Avatar className="h-5 w-5">
            <AvatarImage src={assignee.avatar_url ?? undefined} />
            <AvatarFallback className="text-[8px] bg-gray-200 text-gray-600">
              {getInitials(assignee.full_name)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}
