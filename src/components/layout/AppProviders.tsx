'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RoleProvider } from '@/context/RoleContext'
import { SidebarProvider } from '@/context/SidebarContext'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import KeyboardShortcutsHelp from '@/components/shared/KeyboardShortcutsHelp'

function KeyboardShortcutsInit() {
  useKeyboardShortcuts()
  return null
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <SidebarProvider>
          <KeyboardShortcutsInit />
          {children}
          <KeyboardShortcutsHelp />
        </SidebarProvider>
      </RoleProvider>
      <Toaster position="bottom-right" richColors closeButton duration={3000} />
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
