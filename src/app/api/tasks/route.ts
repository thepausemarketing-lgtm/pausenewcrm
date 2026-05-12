import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('tasks')
    .insert({ status: 'todo', priority: 'medium', created_by: user.id, ...body })
    .select('*, client:clients(name,slug), task_assignees(user_id, assigned_at, user:profiles(id,full_name,avatar_url))')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const taskData = data as any

  // Notify assignee if different from creator
  if (body.assigned_to && body.assigned_to !== user.id) {
    await supabase.from('notifications').insert({
      user_id: body.assigned_to,
      type: 'task_assigned' as const,
      title: 'Task assigned to you',
      body: body.title,
      entity_type: 'task',
      entity_id: taskData.id,
      is_read: false,
    })
  }

  // Log activity
  await supabase.from('activity_logs').insert({
    actor_id: user.id,
    action: 'created',
    entity_type: 'task',
    entity_id: taskData.id,
    metadata: { task_title: body.title },
  })

  return NextResponse.json(data)
}
