import TopNav from '@/components/layout/TopNav'
import AppProviders from '@/components/layout/AppProviders'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="flex flex-col h-screen bg-[#f0f2f5] overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </AppProviders>
  )
}
