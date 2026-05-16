export default function ClientsLoading() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-gray-200/80 rounded-lg" />
        <div className="h-9 w-28 bg-gray-200/80 rounded-lg" />
      </div>
      <div className="flex gap-2">
        {[80, 100, 90, 80].map((w, i) => <div key={i} className="h-8 bg-gray-200/80 rounded-lg" style={{ width: w }} />)}
      </div>
      <div className="bg-white/60 rounded-2xl border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3 flex gap-6">
          {[200, 80, 100, 80, 60].map((w, i) => <div key={i} className="h-3 bg-gray-200/80 rounded" style={{ width: w }} />)}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-gray-50 px-4 py-4 flex gap-6 items-center">
            <div className="w-7 h-7 rounded-md bg-gray-100 shrink-0" />
            <div className="h-4 flex-1 bg-gray-100 rounded" />
            <div className="h-5 w-20 bg-gray-100 rounded-full" />
            <div className="h-4 w-24 bg-gray-100 rounded hidden sm:block" />
            <div className="h-4 w-20 bg-gray-100 rounded hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
