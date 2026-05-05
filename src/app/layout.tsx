import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pause Marketing CRM',
  description: 'Internal CRM for Pause Marketing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-white text-gray-900" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
