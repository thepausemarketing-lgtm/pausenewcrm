'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants'
import type { Task, TaskComment } from '@/types/database.types'
import { timeAgo, getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Trash2, Send, Repeat2, X, UserPlus, ChevronDown, ChevronUp, Plus, Check } from 'lucide-react'
import { useRole } from '@/context/RoleContext'
import { toast } from 'sonner'

type TaskWithRelations = Task & {
  client?: { name: string; slug: string } | null
}

type AssigneeRow = {
  id: string; task_id: string; user_id: string; assigned_at: string
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

const STATUS_BUTTONS = [
  { value: 'todo',        label: 'To Do',       bg: 'bg-gray-100',    active: 'bg-gray-800 text-white',      text: 'text-gray-600' },
  { value: 'in_progress', label: 'In Progress', bg: 'bg-blue-50',     active: 'bg-blue-600 text-white',      text: 'text-blue-600' },
  { value: 'in_review',   label: 'In Review',   bg: 'bg-amber-50',    active: 'bg-amber-500 text-white',     text: 'text-amber-600' },
  { value: 'done',        label: 'Done',         bg: 'bg-green-50',    active: 'bg-green-600 text-white',     text: 'text-green-600' },
]

export default function TaskDetailDrawer({ taskId, clients, profiles, onClose, onUpdate, onDelete }: Props) {
  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [assignees, setAssignees] = useState<AssigneeRow[]>([])
  const [comments, setComments] = useState<(TaskComment & { author?: { full_name: string; avatar_url: string | null } | null })[]>([])
  const [newComment, setNewComment] = useState('')
  const [addingAssignee, setAddingAssignee] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; status: string }[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [savingField, setSavingField] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { profile, isAdmin, isManager } = useRole()

  const loadAssignees = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('task_assignees')
      .select('*, user:profiles!task_assignees_user_id_fkey(id,full_name,avatar_url), assigner:profiles!task_assignees_assigned_by_fkey(full_name)')
      .eq('task_id', taskId).order('assigned_at', { ascending: true })
    if (data) setAssignees(data as AssigneeRow[])
  }, [taskId])

  useEffect(() => {
    const loadTask = async () => {
      const { data } = await supabase.from('tasks').select('*, client:clients(name,slug)').eq('id', taskId).single()
      if (data) setTask(data as TaskWithRelations)
    }
    const loadComments = async () => {
      const { data } = await supabase.from('task_comments')
        .select('*, author:profiles!task_comments_author_id_fkey(full_name,avatar_url)')
        .eq('task_id', taskId).order('created_at', { ascending: true })
      if (data) setComments(data as typeof comments)
    }
    const loadSubtasks = async () => {
      const { data } = await supabase.from('tasks').select('id, title, status').eq('parent_task_id', taskId).order('created_at')
      if (data) setSubtasks(data)
    }
    loadTask(); loadComments(); loadAssignees(); loadSubtasks()

    const channel = supabase.channel(`task-${taskId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` },
        async (payload) => {
          const { data } = await supabase.from('task_comments')
            .select('*, author:profiles!task_comments_author_id_fkey(full_name,avatar_url)')
            .eq('id', payload.new.id).single()
          if (data) setComments(prev => [...prev, data as typeof comments[0]])
        }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [taskId])

  // Auto-save a single field immediately
  const saveField = async (field: string, value: unknown) => {
    if (!task) return
    setSavingField(field)
    const updated = { ...task, [field]: value }
    setTask(updated)
    const { data, error } = await supabase.from('tasks').update({ [field]: value } as any)
      .eq('id', taskId).select('*, client:clients(name,slug)').single()
    if (data) onUpdate(data as TaskWithRelations)
    if (error) toast.error('Failed to save')
    setSavingField(null)
  }

  const saveTitle = async () => {
    setEditingTitle(false)
    if (!task?.title.trim()) return
    await saveField('title', task.title)
  }

  const saveDesc = async () => {
    setEditingDesc(false)
    await saveField('description', task?.description ?? null)
  }

  const addAssignee = async (userId: string) => {
    if (assignees.some(a => a.user_id === userId)) return
    setAddingAssignee(false)
    await (supabase as any).from('task_assignees').insert({ task_id: taskId, user_id: userId, assigned_by: profile?.id ?? null })
    if (!task?.assigned_to) {
      await supabase.from('tasks').update({ assigned_to: userId }).eq('id', taskId)
      setTask(prev => prev ? { ...prev, assigned_to: userId } : prev)
    }
    loadAssignees()
  }

  const removeAssignee = async (userId: string) => {
    await (supabase as any).from('task_assignees').delete().eq('task_id', taskId).eq('user_id', userId)
    const remaining = assignees.filter(a => a.user_id !== userId)
    setAssignees(remaining)
    if (task?.assigned_to === userId) {
      const newPrimary = remaining[0]?.user_id ?? null
      await supabase.from('tasks').update({ assigned_to: newPrimary }).eq('id', taskId)
      setTask(prev => prev ? { ...prev, assigned_to: newPrimary } : prev)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    await supabase.from('tasks').delete().eq('id', task.id)
    onDelete(task.id)
    toast('Task deleted', { action: { label: 'Undo', onClick: () => {} }, duration: 5000 })
  }

  const sendComment = async () => {
    if (!newComment.trim() || !profile) return
    const body = newComment.trim()
    await supabase.from('task_comments').insert({ task_id: taskId, author_id: profile.id, body })
    setNewComment('')

    // ── Notify all assignees (except the commenter) via Telegram ─────────────
    const recipientIds = assignees
      .map(a => a.user_id)
      .filter(id => id !== profile.id)

    // Also notify the task's primary assigned_to if they're not in task_assignees
    if (task?.assigned_to && task.assigned_to !== profile.id && !recipientIds.includes(task.assigned_to)) {
      recipientIds.push(task.assigned_to)
    }

    if (recipientIds.length > 0) {
      const taskName = task?.title ?? 'a task'
      const commenterName = profile.full_name ?? 'Someone'
      fetch('/api/telegram-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: recipientIds,
          message: `💬 <b>New comment on "${taskName}"</b>\n\n<b>${commenterName}:</b> ${body}`,
        }),
      }).catch(() => {}) // fire-and-forget
    }
  }

  const addSubtask = async () => {
    const title = newSubtask.trim()
    if (!title) { setAddingSubtask(false); return }
    setNewSubtask('')
    setAddingSubtask(false)
    const { data } = await supabase.from('tasks').insert({ title, status: 'todo', priority: 'medium', parent_task_id: taskId }).select('id, title, status').single()
    if (data) setSubtasks(prev => [...prev, data])
  }

  const toggleSubtask = async (id: string, done: boolean) => {
    const status = done ? 'done' : 'todo'
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    await supabase.from('tasks').update({ status }).eq('id', id)
  }

  if (!task) return (
    <Sheet open onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>
      </SheetContent>
    </Sheet>
  )

  const unassignedProfiles = profiles.filter(p => !assignees.some(a => a.user_id === p.id))

  return (
    <Sheet open onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-3">
            {editingTitle ? (
              <input
                ref={titleRef}
                autoFocus
                value={task.title}
                onChange={e => setTask({ ...task, title: e.target.value })}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                className="w-full text-base font-semibold text-gray-900 border-b-2 border-violet-400 outline-none bg-transparent pb-0.5"
              />
            ) : (
              <h2
                className="text-base font-semibold text-gray-900 cursor-text hover:text-violet-700 transition-colors leading-snug"
                onClick={() => setEditingTitle(true)}
                title="Click to edit"
              >
                {task.title}
                {task.recurrence_type && task.recurrence_type !== 'none' && (
                  <Repeat2 size={13} className="inline ml-1.5 text-violet-400 relative -top-0.5" />
                )}
              </h2>
            )}
            {task.client && (
              <p className="text-xs text-gray-400 mt-1">{task.client.name}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {(isAdmin || isManager) && (
              <button onClick={handleDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">

          {/* ── STATUS — big one-click buttons ── */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Status</p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_BUTTONS.map(s => {
                const active = task.status === s.value
                return (
                  <button
                    key={s.value}
                    onClick={() => saveField('status', s.value)}
                    disabled={savingField === 'status'}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                      active
                        ? `${s.active} border-transparent shadow-sm`
                        : `${s.bg} ${s.text} border-transparent hover:border-gray-200`
                    }`}
                  >
                    {s.label}
                    {active && ' ✓'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── COMPACT FIELDS ROW ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Priority</p>
              <select
                value={task.priority}
                onChange={e => saveField('priority', e.target.value)}
                className="w-full h-8 px-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400"
              >
                {TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Due Date</p>
              <div className="relative">
                <input type="text" readOnly
                  value={task.due_date ? `${task.due_date.slice(8,10)}/${task.due_date.slice(5,7)}/${task.due_date.slice(0,4)}` : 'Not set'}
                  className="w-full h-8 px-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none cursor-pointer"
                />
                <input type="date" value={task.due_date ?? ''}
                  onChange={e => saveField('due_date', e.target.value || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
              </div>
            </div>
          </div>

          {/* ── ASSIGNEES ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Assignees</p>
              {unassignedProfiles.length > 0 && (
                <button onClick={() => setAddingAssignee(v => !v)}
                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium">
                  <UserPlus size={11} /> Add
                </button>
              )}
            </div>
            {addingAssignee && (
              <select autoFocus defaultValue=""
                onChange={e => { if (e.target.value) addAssignee(e.target.value) }}
                className="w-full h-8 px-2.5 text-sm border border-violet-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400 mb-2">
                <option value="">Select person…</option>
                {unassignedProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            )}
            {assignees.length === 0 ? (
              <p className="text-xs text-gray-400">No one assigned</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignees.map(a => (
                  <div key={a.user_id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 group">
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage src={a.user?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[8px] bg-violet-100 text-violet-700 font-semibold">
                        {a.user?.full_name ? getInitials(a.user.full_name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-700">{a.user?.full_name}</span>
                    <button onClick={() => removeAssignee(a.user_id)}
                      className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-0.5">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── DESCRIPTION ── */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Notes</p>
            {editingDesc ? (
              <Textarea
                autoFocus
                rows={3}
                value={task.description ?? ''}
                onChange={e => setTask({ ...task, description: e.target.value })}
                onBlur={saveDesc}
                placeholder="Add notes…"
                className="text-sm"
              />
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                className="min-h-[60px] text-sm text-gray-600 cursor-text p-2.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all"
              >
                {task.description
                  ? <p className="whitespace-pre-wrap">{task.description}</p>
                  : <p className="text-gray-400 italic">Click to add notes…</p>
                }
              </div>
            )}
          </div>

          {/* ── MORE (collapsed by default) ── */}
          <div>
            <button
              onClick={() => setShowMore(v => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showMore ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {showMore ? 'Hide advanced' : 'More options (client, category, recurrence)'}
            </button>

            {showMore && (
              <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Client</p>
                  <select value={task.client_id ?? ''} onChange={e => saveField('client_id', e.target.value || null)}
                    className="w-full h-8 px-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400">
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
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Repeat</p>
                  <select value={task.recurrence_type ?? 'none'} onChange={e => saveField('recurrence_type', e.target.value)}
                    className="w-full h-8 px-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400">
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ── SUBTASKS ── */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Subtasks {subtasks.length > 0 && `(${subtasks.filter(s => s.status === 'done').length}/${subtasks.length})`}
              </p>
              <button onClick={() => setAddingSubtask(true)} className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-0.5">
                <Plus size={11} /> Add
              </button>
            </div>
            <div className="space-y-1.5">
              {subtasks.map(s => (
                <div key={s.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleSubtask(s.id, s.status !== 'done')}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${s.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-violet-400'}`}
                  >
                    {s.status === 'done' && <Check size={10} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className={`text-sm flex-1 ${s.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{s.title}</span>
                </div>
              ))}
              {addingSubtask && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded border border-gray-300 shrink-0" />
                  <input
                    autoFocus
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtask('') } }}
                    onBlur={addSubtask}
                    placeholder="Subtask name…"
                    className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400 border-b border-gray-200"
                  />
                </div>
              )}
              {subtasks.length === 0 && !addingSubtask && (
                <p className="text-xs text-gray-400 italic">No subtasks yet</p>
              )}
            </div>
          </div>

          {/* ── COMMENTS ── */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              Comments {comments.length > 0 && `(${comments.length})`}
            </p>
            <div className="space-y-3 mb-3">
              {comments.length === 0 && (
                <p className="text-xs text-gray-400 italic">No comments yet</p>
              )}
              {comments.map(comment => {
                const author = comment.author as { full_name: string; avatar_url: string | null } | null
                return (
                  <div key={comment.id} className="flex gap-2.5">
                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                      <AvatarImage src={author?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[9px] bg-gray-200 text-gray-600">
                        {author?.full_name ? getInitials(author.full_name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-medium text-gray-900">{author?.full_name}</span>
                        <span className="text-[11px] text-gray-400">{timeAgo(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Write a comment…"
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendComment())}
                className="flex-1 h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <button onClick={sendComment} disabled={!newComment.trim()}
                className="h-9 px-3 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-40 transition-colors">
                <Send size={13} />
              </button>
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  )
}
