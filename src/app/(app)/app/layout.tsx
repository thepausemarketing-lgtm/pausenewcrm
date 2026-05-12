import TopNav from '@/components/layout/TopNav'
import AppProviders from '@/components/layout/AppProviders'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'linear-gradient(145deg, #dce3ed 0%, #e8edf5 35%, #dfe6ee 70%, #e4e9f0 100%)' }}>
        <TopNav />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </AppProviders>
  )
}
