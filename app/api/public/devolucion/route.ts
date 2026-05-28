import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let body: { carnet_cc?: string; elemento?: string; laboratorio?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { carnet_cc, elemento, laboratorio } = body
  if (!carnet_cc || !elemento || !laboratorio) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: prestamo } = await supabase
    .from('fgl_004')
    .select('id')
    .eq('carnet_cc', carnet_cc)
    .eq('elemento', elemento)
    .eq('laboratorio', laboratorio)
    .eq('estado', 'activo')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!prestamo) {
    return NextResponse.json(
      { error: 'No se encontró un préstamo activo para ese documento y elemento en este laboratorio.' },
      { status: 404 }
    )
  }

  const { error } = await supabase
    .from('fgl_004')
    .update({ estado: 'devuelto', fecha_devolucion: new Date().toISOString() })
    .eq('id', prestamo.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
