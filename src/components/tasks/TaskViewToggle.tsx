'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { List, LayoutGrid, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const VIEWS = [
  { href: '/app/tasks',       label: 'My Tasks',  icon: User },
  { href: '/app/tasks/all',   label: 'All Tasks', icon: List },
  { href: '/app/tasks/board', label: 'Board',     icon: LayoutGrid },
]

export default function TaskViewToggle() {
  const pathname = usePathname()
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
      {VIEWS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link key={href} href={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}>
            <Icon size={13} />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
