'use client'

import { useEffect, useRef, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { TASK_PRIORITIES, TASK_CATEGORIES, TASK_STATUSES } from '@/lib/constants'
import type { Task, TaskComment } from '@/types/database.types'
import { timeAgo, getInitials, formatDateTime } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Trash2, Send, Repeat2, X, UserPlus } from 'lucide-react'
import { useRole } from '@/context/RoleContext'

type TaskWithRelations = Task & {
  client?: { name: string; slug: string } | null
}

type AssigneeRow = {
  id: string
  task_id: string
  user_id: string
  assigned_at: string
  assigned_by: string | null
  user: { id: string; full_name: string; avatar_url: string | null } | null
  assigner: { full_name: string } | null
}

interface Props {
  taskId: string
  clients: { id: string; name: string; parent_client_id?: string | null }[]
  profiles: { id: string; full_name: string }[]
  onClose: () => void
  onUpdate: (task: TaskWithRelations) => void
  onDelete: (id: string) => void
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

function getNextDueDate(due: string, type: string, interval: number) {
  const d = new Date(due)
  if (type === 'daily')   d.setDate(d.getDate() + interval)
  if (type === 'weekly')  d.setDate(d.getDate() + interval * 7)
  if (type === 'monthly') d.setMonth(d.getMonth() + interval)
  if (type === 'yearly')  d.setFullYear(d.getFullYear() + interval)
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-')
}

const sel = 'w-full h-9 px-2 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400'

export default function TaskDetailDrawer({ taskId, clients, profiles, onClose, onUpdate, onDelete }: Props) {
  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [assignees, setAssignees] = useState<AssigneeRow[]>([])
  const [comments, setComments] = useState<(TaskComment & { author?: { full_name: string; avatar_url: string | null } | null })[]>([])
  const [newComment, setNewComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [nextCreated, setNextCreated] = useState(false)
  const [addingAssignee, setAddingAssignee] = useState(false)
  const prevStatusRef = useRef<string | null>(null)
  const supabase = createClient()
  const { profile, isAdmin, isManager } = useRole()

  const loadAssignees = async () => {
    const { data } = await (supabase as any)
      .from('task_assignees')
      .select('*, user:profiles!task_assignees_user_id_fkey(id,full_name,avatar_url), assigner:profiles!task_assignees_assigned_by_fkey(full_name)')
      .eq('task_id', taskId)
      .order('assigned_at', { ascending: true })
    if (data) setAssignees(data as AssigneeRow[])
  }

  useEffect(() => {
    const loadTask = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, client:clients(name,slug)')
        .eq('id', taskId)
        .single()
      if (data) {
        setTask(data as TaskWithRelations)
        prevStatusRef.current = (data as TaskWithRelations).status
      }
    }

    const loadComments = async () => {
      const { data } = await supabase
        .from('task_comments')
        .select('*, author:profiles!task_comments_author_id_fkey(full_name,avatar_url)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (data) setComments(data as typeof comments)
    }

    loadTask()
    loadComments()
    loadAssignees()

    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` },
        async (payload) => {
          const { data } = await supabase
            .from('task_comments')
            .select('*, author:profiles!task_comments_author_id_fkey(full_name,avatar_url)')
            .eq('id', payload.new.id).single()
          if (data) setComments(prev => [...prev, data as typeof comments[0]])
        }
      ).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [taskId])

  const handleSave = async () => {
    if (!task) return
    setSaving(true)

    const { data } = await supabase
      .from('tasks')
      .update({
        title: task.title, description: task.description,
        priority: task.priority, category: task.category,
        status: task.status, due_date: task.due_date,
        client_id: task.client_id,
        recurrence_type: task.recurrence_type,
        recurrence_interval: task.recurrence_interval,
        recurrence_end_date: task.recurrence_end_date,
      })
      .eq('id', task.id)
      .select('*, client:clients(name,slug)')
      .single()

    if (data) {
      onUpdate(data as TaskWithRelations)

      const wasNotDone = prevStatusRef.current !== 'done'
      const isNowDone = task.status === 'done'
      const hasRecurrence = task.recurrence_type && task.recurrence_type !== 'none'
      if (wasNotDone && isNowDone && hasRecurrence && task.due_date) {
        const nextDue = getNextDueDate(task.due_date, task.recurrence_type, task.recurrence_interval ?? 1)
        const pastEnd = task.recurrence_end_date && nextDue > task.recurrence_end_date
        if (!pastEnd) {
          const parentId = task.recurrence_parent_id ?? task.id
          const { data: newTask } = await supabase.from('tasks').insert({
            title: task.title, description: task.description,
            priority: task.priority, category: task.category,
            status: 'todo', due_date: nextDue,
            client_id: task.client_id, campaign_id: task.campaign_id,
            created_by: profile?.id ?? null,
            recurrence_type: task.recurrence_type,
            recurrence_interval: task.recurrence_interval,
            recurrence_end_date: task.recurrence_end_date,
            recurrence_parent_id: parentId,
          }).select('id').single()

          // Copy assignees to next occurrence
          if (newTask && assignees.length > 0) {
            await (supabase as any).from('task_assignees').insert(
              assignees.map(a => ({
                task_id: (newTask as any).id,
                user_id: a.user_id,
                assigned_by: profile?.id ?? null,
              }))
            )
          }

          setNextCreated(true)
          setTimeout(() => setNextCreated(false), 4000)
        }
      }
      prevStatusRef.current = task.status
    }
    setSaving(false)
  }

  const addAssignee = async (userId: string) => {
    if (assignees.some(a => a.user_id === userId)) return
    setAddingAssignee(false)
    await (supabase as any).from('task_assignees').insert({
      task_id: taskId, user_id: userId, assigned_by: profile?.id ?? null,
    })
    // Keep assigned_to in sync with first assignee
    if (!task?.assigned_to) {
      await supabase.from('tasks').update({ assigned_to: userId }).eq('id', taskId)
      setTask(prev => prev ? { ...prev, assigned_to: userId } : prev)
    }
    loadAssignees()
  }

  const removeAssignee = async (userId: string) => {
    await (supabase as any).from('task_assignees')
      .delete().eq('task_id', taskId).eq('user_id', userId)
    const remaining = assignees.filter(a => a.user_id !== userId)
    setAssignees(remaining)
    // Update primary assigned_to
    if (task?.assigned_to === userId) {
      const newPrimary = remaining[0]?.user_id ?? null
      await supabase.from('tasks').update({ assigned_to: newPrimary }).eq('id', taskId)
      setTask(prev => prev ? { ...prev, assigned_to: newPrimary } : prev)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', task.id)
    onDelete(task.id)
  }

  const sendComment = async () => {
    if (!newComment.trim() || !profile) return
    await supabase.from('task_comments').insert({
      task_id: taskId, author_id: profile.id, body: newComment.trim(),
    })
    setNewComment('')
  }

  if (!task) return null

  const isRecurring = task.recurrence_type && task.recurrence_type !== 'none'
  const unassignedProfiles = profiles.filter(p => !assignees.some(a => a.user_id === p.id))

  return (
    <Sheet open onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto px-0">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="truncate">{task.title}</span>
              {isRecurring && <Repeat2 size={14} className="text-violet-500 shrink-0" />}
            </div>
            {(isAdmin || isManager) && (
              <button onClick={handleDelete} className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0">
                <Trash2 size={15} />
              </button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-6">
        {task.recurrence_parent_id && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-violet-600 bg-violet-50 rounded-lg px-3 py-1.5">
            <Repeat2 size={12} /> This is a recurring task instance
          </div>
        )}
        {nextCreated && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
            ✓ Next occurrence created automatically
          </div>
        )}

        <div className="mt-5 space-y-5">
          {/* Title & Description */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={task.title} onChange={e => setTask({ ...task, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={task.description ?? ''} onChange={e => setTask({ ...task, description: e.target.value })} placeholder="Add details…" />
            </div>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select value={task.status} onChange={e => setTask({ ...task, status: e.target.value as Task['status'] })} className={sel}>
                {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <select value={task.priority} onChange={e => setTask({ ...task, priority: e.target.value as Task['priority'] })} className={sel}>
                {TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select value={task.category} onChange={e => setTask({ ...task, category: e.target.value as Task['category'] })} className={sel}>
                {TASK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={task.due_date ?? ''} onChange={e => setTask({ ...task, due_date: e.target.value || null })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Client</Label>
              <select value={task.client_id ?? ''} onChange={e => setTask({ ...task, client_id: e.target.value || null })} className={sel}>
                <option value="">No client</option>
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

          {/* Assignees */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Assignees</Label>
              {unassignedProfiles.length > 0 && (
                <button
                  onClick={() => setAddingAssignee(v => !v)}
                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
                >
                  <UserPlus size={12} /> Add
                </button>
              )}
            </div>

            {/* Add assignee dropdown */}
            {addingAssignee && (
              <select
                autoFocus
                defaultValue=""
                onChange={e => { if (e.target.value) addAssignee(e.target.value) }}
                className="w-full h-8 px-2.5 text-sm border border-violet-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400"
              >
                <option value="">Select a person…</option>
                {unassignedProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            )}

            {/* Current assignees */}
            <div className="space-y-1.5">
              {assignees.length === 0 ? (
                <p className="text-xs text-gray-400 py-1">No one assigned yet</p>
              ) : assignees.map(a => (
                <div key={a.user_id} className="flex items-center gap-2.5 group">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={a.user?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[9px] bg-violet-100 text-violet-700 font-semibold">
                      {a.user?.full_name ? getInitials(a.user.full_name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-800 flex-1">{a.user?.full_name}</span>
                  <span className="text-xs text-gray-400 hidden group-hover:block">
                    Added {timeAgo(a.assigned_at)}{a.assigner ? ` by ${a.assigner.full_name}` : ''}
                  </span>
                  <button
                    onClick={() => removeAssignee(a.user_id)}
                    className="p-0.5 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recurrence */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <Repeat2 size={14} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Repeat</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={task.recurrence_type ?? 'none'} onChange={e => setTask({ ...task, recurrence_type: e.target.value })}
                className="h-8 px-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400">
                {RECURRENCE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {isRecurring && (
                <>
                  <span className="text-sm text-gray-500">every</span>
                  <Input type="number" min={1} max={99} value={task.recurrence_interval ?? 1}
                    onChange={e => setTask({ ...task, recurrence_interval: parseInt(e.target.value) || 1 })}
                    className="w-16 h-8 text-sm" />
                  <span className="text-sm text-gray-500">{RECURRENCE_UNIT[task.recurrence_type]}</span>
                </>
              )}
            </div>
            {isRecurring && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">End date (optional)</span>
                <Input type="date" value={task.recurrence_end_date ?? ''}
                  onChange={e => setTask({ ...task, recurrence_end_date: e.target.value || null })}
                  className="h-7 text-xs w-36" />
              </div>
            )}
            {isRecurring && (
              <p className="text-xs text-gray-400">When marked <strong>Done</strong>, the next occurrence is created automatically.</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Created {formatDateTime(task.created_at)}
            </p>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>

          {/* Assignment History */}
          {assignees.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assignment History</p>
              <div className="space-y-1.5">
                {assignees.map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-300 shrink-0" />
                    <span>
                      <span className="font-medium text-gray-700">{a.user?.full_name}</span>
                      {' '}assigned
                      {a.assigner ? <> by <span className="font-medium text-gray-700">{a.assigner.full_name}</span></> : ''}
                      {' '}· {timeAgo(a.assigned_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="border-t border-gray-100 pt-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Comments</h4>
            <div className="space-y-3 mb-4">
              {comments.map(comment => {
                const author = comment.author as { full_name: string; avatar_url: string | null } | null
                return (
                  <div key={comment.id} className="flex gap-2.5">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={author?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px] bg-gray-200 text-gray-600">
                        {author?.full_name ? getInitials(author.full_name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-gray-900">{author?.full_name}</span>
                        <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">{comment.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <Input value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Write a comment…"
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendComment())}
                className="flex-1" />
              <Button size="sm" onClick={sendComment} disabled={!newComment.trim()} className="shrink-0">
                <Send size={14} />
              </Button>
            </div>
          </div>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
