import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const supabase = await createClient()
  const { data: prev } = await supabase.from('content_items').select('title, assigned_to').eq('id', id).single()
  const { data, error } = await supabase.from('content_items').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify newly assigned user
  const { data: { user } } = await supabase.auth.getUser()
  if (body.assigned_to && prev && body.assigned_to !== prev.assigned_to && user && body.assigned_to !== user.id) {
    await supabase.from('notifications').insert({
      user_id: body.assigned_to,
      type: 'content_review' as const,
      title: 'Content assigned to you',
      body: prev.title,
      entity_type: 'content_item',
      entity_id: id,
      is_read: false,
    })
  }

  // Log activity
  if (user) {
    const changedFields = Object.keys(body).filter(k => k !== 'updated_at')
    if (changedFields.length > 0) {
      await supabase.from('activity_logs').insert({
        actor_id: user.id,
        action: 'updated',
        entity_type: 'content_item',
        entity_id: id,
        metadata: { fields: changedFields, title: prev?.title },
      })
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('content_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
