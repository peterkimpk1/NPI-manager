import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('npi_items_view')
    .select('*')
    .eq('needs_review', true)
    .eq('is_active', true)
    .order('review_source', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { itemId, action, updates } = body

  if (!itemId || !action) {
    return NextResponse.json({ error: 'Missing itemId or action' }, { status: 400 })
  }

  if (action === 'complete') {
    const { data, error } = await supabase.rpc('complete_item_review', {
      p_item_id: itemId,
      p_updates: updates || {},
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  }

  if (action === 'skip' || action === 'archive') {
    const { data, error } = await supabase.rpc('skip_item_review', {
      p_item_id: itemId,
      p_deactivate: action === 'archive',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
