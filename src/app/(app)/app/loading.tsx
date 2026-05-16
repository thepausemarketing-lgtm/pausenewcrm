// Root loading fallback — covers every page under /app that doesn't have
// its own loading.tsx. Shows instantly on navigation so there's no blank screen.
export default function AppLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 animate-pulse">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 bg-gray-200/80 rounded-lg" />
        <div className="h-8 w-28 bg-gray-200/80 rounded-lg" />
      </div>
      {/* Filter bar */}
      <div className="flex gap-2">
        <div className="h-9 w-36 bg-gray-200/80 rounded-lg" />
        <div className="h-9 w-28 bg-gray-200/80 rounded-lg" />
        <div className="h-9 w-28 bg-gray-200/80 rounded-lg" />
      </div>
      {/* Table rows */}
      <div className="bg-white/60 rounded-2xl border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3 flex gap-4">
          {[140, 80, 80, 100, 80].map((w, i) => (
            <div key={i} className="h-3 bg-gray-200/80 rounded" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b border-gray-50 px-4 py-3.5 flex gap-4 items-center">
            <div className="h-4 bg-gray-100 rounded flex-1" />
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
