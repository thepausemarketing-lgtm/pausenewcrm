import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import AppProviders from '@/components/layout/AppProviders'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="flex h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #d4c5f9 0%, #e8e0fb 25%, #f0ebff 55%, #f7f5ff 100%)' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AppProviders>
  )
}
