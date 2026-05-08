import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      {/* Widgets */}
      <div className="grid grid-cols-3 gap-6">
        {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
      {/* Pipeline */}
      <Skeleton className="h-24 rounded-xl" />
      {/* Team */}
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    </div>
  )
}
