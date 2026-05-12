import Link from 'next/link'

const SETTINGS_TABS = [
  { href: '/app/settings/profile', label: 'Profile' },
  { href: '/app/settings/notifications', label: 'Notifications' },
  { href: '/app/settings/workspace', label: 'Workspace' },
  { href: '/app/settings/team', label: 'Team' },
  { href: '/app/settings/designations', label: 'Designations' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5">Settings</h2>
      <div className="flex gap-1 mb-6 overflow-x-auto border-b border-gray-100 pb-1">
        {SETTINGS_TABS.map(({ href, label }) => (
          <Link key={href} href={href}
            className="px-3 py-1.5 text-sm rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap transition-colors">
            {label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  )
}
