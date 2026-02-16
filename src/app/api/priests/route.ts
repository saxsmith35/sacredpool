import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('priests')
    .select('*')
    .order('last_served_date', { ascending: true, nullsFirst: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, phone_number, ordination_date } = body

  if (!name || !phone_number) {
    return NextResponse.json({ error: 'Name and phone number required' }, { status: 400 })
  }

  // Validate E.164
  if (!/^\+[1-9]\d{1,14}$/.test(phone_number)) {
    return NextResponse.json({ error: 'Phone must be E.164 format (e.g. +12345678901)' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('priests')
    .insert({ name, phone_number, ordination_date: ordination_date || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('priests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()

  const { error } = await supabaseAdmin
    .from('priests')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
