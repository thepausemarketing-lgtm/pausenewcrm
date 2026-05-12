import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function useKeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      // Skip if modifier keys (except the shortcuts below)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key) {
        case '1':
          router.push('/app/dashboard')
          break
        case '2':
          router.push('/app/calendar')
          break
        case '3':
          router.push('/app/tasks')
          break
        case '4':
          router.push('/app/clients')
          break
        case 'n':
        case 'N':
          // Open new task modal from anywhere
          window.dispatchEvent(new CustomEvent('new-task'))
          break
        case 'c':
        case 'C':
          // Open new content item from anywhere on calendar
          window.dispatchEvent(new CustomEvent('new-content'))
          break
        case '?':
          window.dispatchEvent(new CustomEvent('show-shortcuts'))
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router, pathname])
}
