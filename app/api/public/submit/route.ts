import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TABLES = ['fgl_004', 'fgl_010', 'fgl_140']

export async function POST(req: NextRequest) {
  let body: { tabla?: string; datos?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { tabla, datos } = body

  if (!tabla || !ALLOWED_TABLES.includes(tabla)) {
    return NextResponse.json({ error: 'Tabla no permitida' }, { status: 400 })
  }
  if (!datos || typeof datos !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase.from(tabla).insert([datos])
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
