import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

interface Assignee {
  user_id: string
  user: { id: string; full_name: string; avatar_url: string | null } | null
}

interface Props {
  assignees: Assignee[]
  max?: number
  size?: 'xs' | 'sm'
}

export default function AssigneeStack({ assignees, max = 3, size = 'sm' }: Props) {
  if (!assignees || assignees.length === 0) return <span className="text-gray-400">—</span>

  const shown = assignees.slice(0, max)
  const extra = assignees.length - max

  const dim = size === 'xs' ? 'h-5 w-5' : 'h-6 w-6'
  const font = size === 'xs' ? 'text-[8px]' : 'text-[9px]'

  return (
    <div className="flex items-center">
      {shown.map((a, i) => (
        <div
          key={a.user_id}
          title={a.user?.full_name}
          style={{ marginLeft: i === 0 ? 0 : -6, zIndex: shown.length - i }}
          className="relative"
        >
          <Avatar className={`${dim} ring-2 ring-white`}>
            <AvatarImage src={a.user?.avatar_url ?? undefined} />
            <AvatarFallback className={`${font} bg-violet-100 text-violet-700 font-semibold`}>
              {a.user?.full_name ? getInitials(a.user.full_name) : '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{ marginLeft: -6 }}
          className={`${dim} rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center ${font} text-gray-500 font-medium`}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}
