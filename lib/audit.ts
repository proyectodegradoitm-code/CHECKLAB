import { SupabaseClient } from '@supabase/supabase-js'

type AuditEntry = {
  tabla: string
  registro_id?: string
  accion: 'crear' | 'editar' | 'eliminar' | 'devolucion'
  descripcion: string
  usuario?: string
  laboratorio?: string
  organizacion_id?: string
  datos?: Record<string, unknown>
}

export async function logAudit(supabase: SupabaseClient, entry: AuditEntry) {
  try {
    await supabase.from('audit_log').insert([{
      tabla: entry.tabla,
      registro_id: entry.registro_id ?? null,
      accion: entry.accion,
      descripcion: entry.descripcion,
      usuario: entry.usuario ?? null,
      laboratorio: entry.laboratorio ?? null,
      organizacion_id: entry.organizacion_id ?? null,
      datos: entry.datos ?? null,
    }])
  } catch {
    // Fallo silencioso para no interrumpir operaciones principales
  }
}
