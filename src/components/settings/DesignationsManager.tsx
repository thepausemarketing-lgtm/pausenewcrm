'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, GripVertical, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Designation } from '@/types/database.types'

interface Props {
  initialDesignations: Designation[]
}

export default function DesignationsManager({ initialDesignations }: Props) {
  const [designations, setDesignations] = useState<Designation[]>(initialDesignations)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (createClient() as any).from('designations')

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const { data } = await db.insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      sort_order: designations.length,
    }).select().single()
    if (data) setDesignations(prev => [...prev, data as Designation])
    setNewName('')
    setNewDesc('')
    setSaving(false)
  }

  const startEdit = (d: Designation) => {
    setEditId(d.id)
    setEditName(d.name)
    setEditDesc(d.description ?? '')
  }

  const handleSaveEdit = async () => {
    if (!editId || !editName.trim()) return
    setSaving(true)
    const { data } = await db
      .update({ name: editName.trim(), description: editDesc.trim() || null })
      .eq('id', editId)
      .select().single()
    if (data) setDesignations(prev => prev.map(d => d.id === editId ? data as Designation : d))
    setEditId(null)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this designation? Team members with this designation will have it cleared.')) return
    await db.delete().eq('id', id)
    setDesignations(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Designations</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Create job designations like Designer, Account Manager, Video Editor, etc.
            These appear when setting up team members and defining the reporting hierarchy.
          </p>
        </div>
      </div>

      {/* Add new */}
      <div className="flex gap-2 mb-6">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Designation name (e.g. Graphic Designer)"
          className="flex-1"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <Input
          value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
          placeholder="Short description (optional)"
          className="flex-1"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={!newName.trim() || saving} size="sm" className="gap-1.5 shrink-0">
          <Plus size={13} /> Add
        </Button>
      </div>

      {/* List */}
      {designations.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">
          No designations yet. Add one above to get started.
        </div>
      ) : (
        <div className="space-y-1.5">
          {designations.map(d => (
            <div key={d.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 group">
              <GripVertical size={14} className="text-gray-300 shrink-0" />

              {editId === d.id ? (
                <>
                  <Input value={editName} onChange={e => setEditName(e.target.value)}
                    className="flex-1 h-7 text-sm" autoFocus />
                  <Input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                    className="flex-1 h-7 text-sm" placeholder="Description" />
                  <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{d.name}</span>
                    {d.description && <span className="ml-2 text-xs text-gray-400">{d.description}</span>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(d)}
                      className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(d.id)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
