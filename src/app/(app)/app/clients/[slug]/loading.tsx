export default function ClientLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      {/* Content rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center py-2 border-b border-gray-50">
          <div className="h-4 flex-1 bg-gray-200/70 rounded" />
          <div className="h-5 w-20 bg-gray-200/70 rounded-full" />
          <div className="h-4 w-24 bg-gray-200/70 rounded hidden sm:block" />
          <div className="h-4 w-16 bg-gray-200/70 rounded hidden sm:block" />
        </div>
      ))}
    </div>
  )
}
