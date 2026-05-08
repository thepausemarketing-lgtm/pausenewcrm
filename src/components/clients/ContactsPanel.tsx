'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Mail, Phone, ExternalLink, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Contact } from '@/types/database.types'
import EmptyState from '@/components/shared/EmptyState'

interface Props {
  clientId: string
  contacts: Contact[]
}

export default function ContactsPanel({ clientId, contacts: initial }: Props) {
  const [contacts, setContacts] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ full_name: '', title: '', email: '', phone: '', linkedin_url: '' })
  const router = useRouter()
  const supabase = createClient()

  const handleAdd = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .insert({ ...form, client_id: clientId, is_primary: contacts.length === 0 })
      .select()
      .single()
    if (!error && data) {
      setContacts([...contacts, data])
      setForm({ full_name: '', title: '', email: '', phone: '', linkedin_url: '' })
      setAdding(false)
      toast.success('Contact added')
    } else if (error) {
      toast.error('Something went wrong')
    }
  }

  const handleDelete = async (id: string) => {
    const deletedContact = contacts.find(c => c.id === id)
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(contacts.filter(c => c.id !== id))
    toast('Contact removed', {
      action: {
        label: 'Undo',
        onClick: () => {
          if (deletedContact) setContacts(prev => [...prev, deletedContact])
        },
      },
      duration: 5000,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Contacts</h3>
        <Button size="sm" variant="outline" onClick={() => setAdding(!adding)} className="gap-1.5">
          <Plus size={13} /> Add Contact
        </Button>
      </div>

      {adding && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-900">New Contact</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'full_name', label: 'Name *', placeholder: 'Jane Smith' },
              { key: 'title', label: 'Title', placeholder: 'Marketing Manager' },
              { key: 'email', label: 'Email', placeholder: 'jane@example.com' },
              { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  placeholder={placeholder}
                  value={(form as Record<string, string>)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            ))}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">LinkedIn URL</Label>
              <Input
                placeholder="https://linkedin.com/in/jane"
                value={form.linkedin_url}
                onChange={e => setForm({ ...form, linkedin_url: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={!form.full_name}>Add</Button>
          </div>
        </div>
      )}

      {contacts.length === 0 && !adding ? (
        <EmptyState
          icon={Mail}
          title="No contacts yet"
          description="Add the people you work with at this client"
          action={
            <Button size="sm" onClick={() => setAdding(true)}>Add first contact</Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{contact.full_name}</p>
                  {contact.is_primary && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                      <Star size={10} className="fill-current" /> Primary
                    </span>
                  )}
                </div>
                {contact.title && <p className="text-sm text-gray-500">{contact.title}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                      <Mail size={11} /> {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                      <Phone size={11} /> {contact.phone}
                    </a>
                  )}
                  {contact.linkedin_url && (
                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                      <ExternalLink size={11} /> LinkedIn
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(contact.id)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
