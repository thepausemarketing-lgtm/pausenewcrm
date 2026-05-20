'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RefreshCw, Trash2, Plus } from 'lucide-react'

interface Connection {
  id: string
  platform: string
  account_name: string
  account_picture: string | null
  last_synced_at: string | null
  is_active: boolean
}

interface Page {
  id: string
  name: string
  picture: { data: { url: string } }
  access_token: string
  instagram_business_account?: { id: string }
}

// Inline SVG icons for platforms not in lucide-react
function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#E1306C" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  facebook_page: <FacebookIcon size={16} />,
  instagram: <InstagramIcon size={16} />,
}

const PLATFORM_LABEL: Record<string, string> = {
  facebook_page: 'Facebook Page',
  instagram: 'Instagram Business',
}

export default function SocialConnectionsPanel({ clientId }: { clientId: string }) {
  const supabase = createClient()
  const [connections, setConnections] = useState<Connection[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [token, setToken] = useState('')
  const [pages, setPages] = useState<Page[]>([])
  const [fetching, setFetching] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const load = async () => {
    const { data } = await db
      .from('social_connections')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('created_at')
    setConnections((data as Connection[]) ?? [])
    setLoaded(true)
  }

  if (!loaded) { load() }

  const fetchPages = async () => {
    setFetching(true)
    try {
      const res = await fetch('/api/meta/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setPages(json.pages)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch pages')
    }
    setFetching(false)
  }

  const connectPage = async (page: Page) => {
    // Connect Facebook Page
    const { error: err1 } = await db.from('social_connections').upsert({
      client_id: clientId,
      platform: 'facebook_page',
      account_id: page.id,
      account_name: page.name,
      account_picture: page.picture?.data?.url ?? null,
      access_token: page.access_token,
    }, { onConflict: 'client_id,platform,account_id' })

    if (err1) { toast.error(err1.message); return }

    // Connect Instagram if linked
    if (page.instagram_business_account?.id) {
      await db.from('social_connections').upsert({
        client_id: clientId,
        platform: 'instagram',
        account_id: page.instagram_business_account.id,
        account_name: `${page.name} (Instagram)`,
        account_picture: page.picture?.data?.url ?? null,
        access_token: page.access_token, // Page token works for linked IG
      }, { onConflict: 'client_id,platform,account_id' })
    }

    toast.success(`Connected ${page.name}`)
    setShowModal(false)
    setPages([])
    setToken('')
    load()
  }

  const syncConnection = async (connId: string) => {
    setSyncing(connId)
    const now = new Date()
    const res = await fetch('/api/meta/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId: connId, month: now.getMonth() + 1, year: now.getFullYear() }),
    })
    const json = await res.json()
    if (json.error) toast.error(json.error)
    else toast.success('Synced!')
    setSyncing(null)
    load()
  }

  const deleteConnection = async (connId: string) => {
    if (!confirm('Remove this connection?')) return
    await db.from('social_connections').update({ is_active: false }).eq('id', connId)
    toast.success('Removed')
    load()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Connected Channels</h3>
        <Button variant="outline" size="sm" onClick={() => setShowModal(true)} className="gap-1.5 text-xs">
          <Plus size={13} /> Connect Account
        </Button>
      </div>

      {connections.length === 0 ? (
        <div className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">
          No channels connected yet
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map(conn => (
            <div key={conn.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-white">
              <div className="flex items-center gap-2">
                {conn.account_picture
                  ? <img src={conn.account_picture} className="w-7 h-7 rounded-full" alt="" />
                  : <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">{PLATFORM_ICON[conn.platform]}</div>
                }
                <div>
                  <div className="text-sm font-medium text-gray-800">{conn.account_name}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    {PLATFORM_ICON[conn.platform]} {PLATFORM_LABEL[conn.platform] ?? conn.platform}
                    {conn.last_synced_at && (
                      <span className="ml-1">· synced {new Date(conn.last_synced_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => syncConnection(conn.id)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                  title="Sync now"
                >
                  <RefreshCw size={13} className={syncing === conn.id ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => deleteConnection(conn.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                  title="Remove"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Connect Meta Account</h3>
            <p className="text-xs text-gray-500 mb-4">
              Go to{' '}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 underline"
              >
                Graph Explorer
              </a>
              , select your app, generate a token with{' '}
              <code className="bg-gray-100 px-1 rounded">
                pages_show_list, pages_read_engagement, instagram_basic, instagram_manage_insights, read_insights
              </code>{' '}
              permissions, and paste it below.
            </p>
            <textarea
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Paste access token here..."
              className="w-full border border-gray-200 rounded-lg p-3 text-xs font-mono h-24 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {pages.length === 0 ? (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowModal(false); setToken('') }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={fetchPages}
                  disabled={!token || fetching}
                  className="flex-1"
                >
                  {fetching ? 'Fetching…' : 'Fetch Pages'}
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-500 font-medium">Select a page to connect:</p>
                {pages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => connectPage(page)}
                    className="w-full flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-colors text-left"
                  >
                    {page.picture?.data?.url
                      ? <img src={page.picture.data.url} className="w-8 h-8 rounded-full" alt="" />
                      : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <FacebookIcon size={14} />
                        </div>
                      )
                    }
                    <div>
                      <div className="text-sm font-medium text-gray-800">{page.name}</div>
                      <div className="text-xs text-gray-400">
                        {page.instagram_business_account ? '+ Instagram linked' : 'Facebook Page only'}
                      </div>
                    </div>
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-1"
                  onClick={() => { setPages([]); setToken('') }}
                >
                  ← Back
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
