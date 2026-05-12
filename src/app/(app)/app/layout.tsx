import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import AppProviders from '@/components/layout/AppProviders'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="flex h-screen bg-[#f0eeff] overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f0eeff]">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AppProviders>
  )
}
