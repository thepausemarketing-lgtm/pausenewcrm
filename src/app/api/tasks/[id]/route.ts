import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function addInterval(dateStr: string, type: string, interval: number): string {
  const d = new Date(dateStr)
  if (type === 'daily')   d.setDate(d.getDate() + interval)
  if (type === 'weekly')  d.setDate(d.getDate() + 7 * interval)
  if (type === 'monthly') d.setMonth(d.getMonth() + interval)
  return d.toISOString().split('T')[0]
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const supabase = await createClient()

  // Fetch current task to detect assignment changes + recurrence
  const { data: prev } = await supabase.from('tasks').select('assigned_to, title, recurrence_type, recurrence_interval, recurrence_end_date, due_date, status, client_id, campaign_id, priority, category').eq('id', id).single()

  const { data, error } = await supabase.from('tasks').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire notification if assignee changed
  if (body.assigned_to && prev && body.assigned_to !== prev.assigned_to) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && body.assigned_to !== user.id) {
      await supabase.from('notifications').insert({
        user_id: body.assigned_to,
        type: 'task_assigned',
        title: 'Task assigned to you',
        body: prev.title,
        entity_type: 'task',
        entity_id: id,
        is_read: false,
      })
    }
  }

  // Spawn next recurring task when marked done
  if (body.status === 'done' && prev?.recurrence_type && prev.recurrence_type !== 'none' && prev.due_date) {
    const nextDue = addInterval(prev.due_date, prev.recurrence_type, prev.recurrence_interval ?? 1)
    const endDate = prev.recurrence_end_date
    if (!endDate || nextDue <= endDate) {
      await supabase.from('tasks').insert({
        title: prev.title,
        priority: prev.priority,
        category: prev.category,
        client_id: prev.client_id,
        campaign_id: prev.campaign_id,
        due_date: nextDue,
        status: 'todo',
        recurrence_type: prev.recurrence_type,
        recurrence_interval: prev.recurrence_interval,
        recurrence_end_date: prev.recurrence_end_date,
        recurrence_parent_id: id,
      })
    }
  }

  // Log activity
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const changedFields = Object.keys(body).filter(k => k !== 'updated_at')
    if (changedFields.length > 0) {
      await supabase.from('activity_logs').insert({
        actor_id: user.id,
        action: 'updated',
        entity_type: 'task',
        entity_id: id,
        metadata: { fields: changedFields, task_title: prev?.title },
      }).then(() => {})  // fire-and-forget
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: task } = await supabase.from('tasks').select('title').eq('id', id).single()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log activity
  const { data: { user } } = await supabase.auth.getUser()
  if (user && task) {
    await supabase.from('activity_logs').insert({
      actor_id: user.id,
      action: 'deleted',
      entity_type: 'task',
      entity_id: id,
      metadata: { task_title: task.title },
    })
  }

  return NextResponse.json({ ok: true })
}
