'use client'
import { useEffect, useState } from 'react'

const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'Open command palette' },
  { keys: ['1'], description: 'Go to Dashboard' },
  { keys: ['2'], description: 'Go to Content Calendar' },
  { keys: ['3'], description: 'Go to Tasks' },
  { keys: ['4'], description: 'Go to Clients' },
  { keys: ['?'], description: 'Show this help' },
  { keys: ['Esc'], description: 'Close modal / drawer' },
]

export default function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('show-shortcuts', handler)
    return () => window.removeEventListener('show-shortcuts', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpen(false)} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 w-80">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Keyboard Shortcuts</h3>
        <div className="space-y-3">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd key={j} className="text-[11px] bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded font-mono text-gray-700">{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-4 text-center">Press Esc to close</p>
      </div>
    </>
  )
}
