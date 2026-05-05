import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { full_name, email, password, role } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // Update profile with role and full_name
  await supabase.from('profiles').update({ role, full_name }).eq('id', authData.user.id)

  return NextResponse.json({ success: true })
}
