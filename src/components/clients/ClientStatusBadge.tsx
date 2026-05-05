import { CLIENT_STATUSES } from '@/lib/constants'
import type { ClientStatus } from '@/types/database.types'
import StatusBadge from '@/components/shared/StatusBadge'

export default function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const def = CLIENT_STATUSES.find(s => s.value === status)!
  return <StatusBadge label={def.label} color={def.color} />
}
