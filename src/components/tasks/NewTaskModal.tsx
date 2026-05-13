'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { TASK_PRIORITIES, TASK_CATEGORIES } from '@/lib/constants'
import { Repeat2 } from 'lucide-react'
import type { Task } from '@/types/database.types'

type TaskWithRelations = Task & {
  client?: { name: string; slug: string } | null
  assignee?: { full_name: string; avatar_url: string | null } | null
}

interface Props {
  defaultStatus: string
  clients: { id: string; name: string; parent_client_id?: string | null }[]
  profiles: { id: string; full_name: string }[]
  currentUserId: string
  onCreated: (task: TaskWithRelations) => void
  onClose: () => void
}

const RECURRENCE_TYPES = [
  { value: 'none',    label: 'Does not repeat' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
]

const RECURRENCE_UNIT: Record<string, string> = {
  daily: 'day(s)', weekly: 'week(s)', monthly: 'month(s)', yearly: 'year(s)',
}

const sel = 'w-full h-9 px-2 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400'

export default function NewTaskModal({ defaultStatus, clients, profiles, currentUserId, onCreated, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [category, setCategory] = useState('other')
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([currentUserId])
  const [clientId, setClientId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [recurrenceType, setRecurrenceType] = useState('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const isRecurring = recurrenceType !== 'none'

  const handleSubmit = async () => {
    if (!title.trim()) return
    setLoading(true)

    const primaryAssignee = selectedAssignees[0] ?? null

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description || null,
        priority: priority as Task['priority'],
        category: category as Task['category'],
        status: defaultStatus as Task['status'],
        assigned_to: primaryAssignee,
        client_id: clientId || null,
        due_date: dueDate || null,
        created_by: currentUserId,
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceInterval,
        recurrence_end_date: recurrenceEndDate || null,
      })
      .select('*, client:clients(name,slug)')
      .single()

    const task = data as Task | null
    if (!error && task) {
      // Insert into task_assignees for all selected
      if (selectedAssignees.length > 0) {
        await (supabase as any).from('task_assignees').insert(
          selectedAssignees.map(uid => ({
            task_id: task.id, user_id: uid, assigned_by: currentUserId,
          }))
        )
      }
      await supabase.from('activity_logs').insert({
        actor_id: currentUserId, action: 'created_task', entity_type: 'task', entity_id: task.id,
      })
      // Telegram notification — fire-and-forget, don't await
      const notifyIds = selectedAssignees.filter(id => id !== currentUserId)
      if (notifyIds.length > 0) {
        const assigner = profiles.find(p => p.id === currentUserId)
        fetch('/api/telegram-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIds: notifyIds,
            message: `📋 <b>New Task Assigned</b>\n\n<b>${task.title}</b>${task.due_date ? `\n📅 Due: ${new Date(task.due_date).toLocaleDateString('en-GB')}` : ''}\n\nAssigned by ${assigner?.full_name ?? 'someone'} on Pause CRM.`,
          }),
        })
      }
      toast.success('Task created')
      onCreated(task as TaskWithRelations)
    } else if (error) {
      toast.error('Something went wrong')
    }
    setLoading(false)
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className={sel}>
                {TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={sel}>
                {TASK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Assignees</Label>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-36 overflow-y-auto">
                {profiles.map(p => (
                  <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedAssignees.includes(p.id)}
                      onChange={e => setSelectedAssignees(prev =>
                        e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                      )}
                      className="accent-violet-600"
                    />
                    {p.full_name}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full h-9 px-2.5 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Client</Label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} className={sel}>
                <option value="">No client (optional)</option>
                {clients.filter(c => !c.parent_client_id).map(parent => {
                  const subs = clients.filter(c => c.parent_client_id === parent.id)
                  if (subs.length === 0) return <option key={parent.id} value={parent.id}>{parent.name}</option>
                  return (
                    <optgroup key={parent.id} label={parent.name}>
                      <option value={parent.id}>{parent.name} (main)</option>
                      {subs.map(sub => <option key={sub.id} value={sub.id}>↳ {sub.name}</option>)}
                    </optgroup>
                  )
                })}
              </select>
            </div>
          </div>

          {/* Recurrence */}
          <div className="border border-gray-100 rounded-xl p-3.5 space-y-2.5 bg-gray-50">
            <div className="flex items-center gap-2">
              <Repeat2 size={13} className="text-gray-500" />
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Repeat</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={recurrenceType}
                onChange={e => setRecurrenceType(e.target.value)}
                className="h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400"
              >
                {RECURRENCE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>

              {isRecurring && (
                <>
                  <span className="text-sm text-gray-500">every</span>
                  <Input
                    type="number" min={1} max={99}
                    value={recurrenceInterval}
                    onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                    className="w-16 h-8 text-sm"
                  />
                  <span className="text-sm text-gray-500">{RECURRENCE_UNIT[recurrenceType]}</span>
                </>
              )}
            </div>

            {isRecurring && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">End date (optional)</span>
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={e => setRecurrenceEndDate(e.target.value)}
                  className="h-7 text-xs w-36 px-2 border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || loading}>
            {loading ? 'Creating…' : 'Create Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
