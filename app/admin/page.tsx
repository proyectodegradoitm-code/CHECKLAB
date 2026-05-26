import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? ''

const fmtDT = (d: string) =>
  new Date(d).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

async function getStats() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let s1 = supabase.from('fgl_004').select('*', { count: 'exact', head: true })
  let s2 = supabase.from('fgl_004').select('*', { count: 'exact', head: true }).eq('estado', 'activo')
  let s3 = supabase.from('fgl_010').select('*', { count: 'exact', head: true })
  let s4 = supabase.from('fgl_010').select('*', { count: 'exact', head: true }).lt('fecha_vencimiento', today).not('fecha_vencimiento', 'is', null)
  let s5 = supabase.from('fgl_010').select('*', { count: 'exact', head: true }).gte('fecha_vencimiento', today).lte('fecha_vencimiento', in30days)
  let s6 = supabase.from('fgl_140').select('*', { count: 'exact', head: true })
  let s7 = supabase.from('fgl_140').select('*', { count: 'exact', head: true }).lt('fecha_vencimiento', today).not('fecha_vencimiento', 'is', null)
  let s8 = supabase.from('fgl_140').select('*', { count: 'exact', head: true }).gte('fecha_vencimiento', today).lte('fecha_vencimiento', in30days)
  let s9 = supabase.from('qr_codes').select('*', { count: 'exact', head: true }).eq('activo', true)
  if (ORG_ID) {
    s1 = s1.eq('organizacion_id', ORG_ID)
    s2 = s2.eq('organizacion_id', ORG_ID)
    s3 = s3.eq('organizacion_id', ORG_ID)
    s4 = s4.eq('organizacion_id', ORG_ID)
    s5 = s5.eq('organizacion_id', ORG_ID)
    s6 = s6.eq('organizacion_id', ORG_ID)
    s7 = s7.eq('organizacion_id', ORG_ID)
    s8 = s8.eq('organizacion_id', ORG_ID)
    s9 = s9.eq('organizacion_id', ORG_ID)
  }

  const [
    { count: totalPrestamos },
    { count: prestamosActivos },
    { count: totalSustancias },
    { count: sustanciasVencidas },
    { count: sustanciasProximas },
    { count: totalEpp },
    { count: eppVencidos },
    { count: eppProximos },
    { count: totalQr },
  ] = await Promise.all([s1, s2, s3, s4, s5, s6, s7, s8, s9])

  return { totalPrestamos, prestamosActivos, totalSustancias, sustanciasVencidas, sustanciasProximas, totalEpp, eppVencidos, eppProximos, totalQr }
}

async function getAlerts() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let q1 = supabase.from('fgl_004').select('nombre, elemento, laboratorio, fecha_entrega').eq('estado', 'activo').order('fecha_entrega').limit(5)
  let q2 = supabase.from('fgl_010').select('nombre_producto, laboratorio, fecha_vencimiento').lt('fecha_vencimiento', today).not('fecha_vencimiento', 'is', null).order('fecha_vencimiento').limit(5)
  let q3 = supabase.from('fgl_010').select('nombre_producto, laboratorio, fecha_vencimiento').gte('fecha_vencimiento', today).lte('fecha_vencimiento', in30days).order('fecha_vencimiento').limit(5)
  let q4 = supabase.from('fgl_140').select('laboratorio, elemento_tipo, identificacion, fecha_vencimiento').lt('fecha_vencimiento', today).not('fecha_vencimiento', 'is', null).order('fecha_vencimiento').limit(5)
  let q5 = supabase.from('fgl_140').select('laboratorio, elemento_tipo, identificacion, fecha_vencimiento').gte('fecha_vencimiento', today).lte('fecha_vencimiento', in30days).order('fecha_vencimiento').limit(5)
  if (ORG_ID) {
    q1 = q1.eq('organizacion_id', ORG_ID)
    q2 = q2.eq('organizacion_id', ORG_ID)
    q3 = q3.eq('organizacion_id', ORG_ID)
    q4 = q4.eq('organizacion_id', ORG_ID)
    q5 = q5.eq('organizacion_id', ORG_ID)
  }

  const [
    { data: prestamosActivos },
    { data: sustanciasVencidas },
    { data: sustanciasProximas },
    { data: eppVencidos },
    { data: eppProximos },
  ] = await Promise.all([q1, q2, q3, q4, q5])

  return { prestamosActivos, sustanciasVencidas, sustanciasProximas, eppVencidos, eppProximos }
}

async function getRecentActivity() {
  const supabase = await createClient()
  let query = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(10)
  if (ORG_ID) query = query.eq('organizacion_id', ORG_ID)
  const { data } = await query
  return data ?? []
}

export default async function AdminDashboard() {
  const [stats, alerts, actividad] = await Promise.all([getStats(), getAlerts(), getRecentActivity()])

  const statCards = [
    { label: 'QR Activos',            value: stats.totalQr ?? 0,            icon: '📱', color: 'border-blue-200 bg-blue-50',    textColor: 'text-blue-700',   href: '/admin/qr' },
    { label: 'Préstamos Activos',     value: stats.prestamosActivos ?? 0,   icon: '🔑', color: (stats.prestamosActivos ?? 0) > 0 ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200' : 'border-gray-100 bg-white', textColor: (stats.prestamosActivos ?? 0) > 0 ? 'text-orange-600' : 'text-gray-800', href: '/admin/fgl004' },
    { label: 'Total Préstamos',       value: stats.totalPrestamos ?? 0,     icon: '📋', color: 'border-gray-100 bg-white',       textColor: 'text-gray-800',   href: '/admin/fgl004' },
    { label: 'Sustancias Registradas',value: stats.totalSustancias ?? 0,    icon: '🧪', color: 'border-purple-200 bg-purple-50', textColor: 'text-purple-700', href: '/admin/fgl010' },
    { label: 'Sustancias Vencidas',   value: stats.sustanciasVencidas ?? 0, icon: '🚨', color: (stats.sustanciasVencidas ?? 0) > 0 ? 'border-red-300 bg-red-50 ring-1 ring-red-200' : 'border-gray-100 bg-white', textColor: (stats.sustanciasVencidas ?? 0) > 0 ? 'text-red-600' : 'text-gray-800', href: '/admin/fgl010' },
    { label: 'Sustancias por Vencer', value: stats.sustanciasProximas ?? 0, icon: '⚠️', color: (stats.sustanciasProximas ?? 0) > 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-white', textColor: (stats.sustanciasProximas ?? 0) > 0 ? 'text-amber-600' : 'text-gray-800', href: '/admin/fgl010' },
    { label: 'Registros EPP',         value: stats.totalEpp ?? 0,           icon: '🦺', color: 'border-green-200 bg-green-50',  textColor: 'text-green-700',  href: '/admin/fgl140' },
    { label: 'EPP Vencidos',          value: stats.eppVencidos ?? 0,        icon: '🚨', color: (stats.eppVencidos ?? 0) > 0 ? 'border-red-300 bg-red-50 ring-1 ring-red-200' : 'border-gray-100 bg-white', textColor: (stats.eppVencidos ?? 0) > 0 ? 'text-red-600' : 'text-gray-800', href: '/admin/fgl140' },
    { label: 'EPP por Vencer',        value: stats.eppProximos ?? 0,        icon: '⏰', color: (stats.eppProximos ?? 0) > 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-white', textColor: (stats.eppProximos ?? 0) > 0 ? 'text-amber-600' : 'text-gray-800', href: '/admin/fgl140' },
  ]

  const accionColors: Record<string, string> = {
    crear: 'bg-green-100 text-green-700',
    editar: 'bg-blue-100 text-blue-700',
    eliminar: 'bg-red-100 text-red-700',
    devolucion: 'bg-purple-100 text-purple-700',
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
        <p className="text-gray-600 text-sm mt-1">Laboratorios de Docencia e Investigación — ITM</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map(card => (
          <Link key={card.label} href={card.href}
            className={`rounded-xl shadow-sm border p-5 transition-shadow hover:shadow-md ${card.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{card.label}</p>
                <p className={`text-3xl font-bold mt-1 ${card.textColor}`}>{card.value}</p>
              </div>
              <span className="text-3xl">{card.icon}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Alertas y Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Alertas críticas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">🚨 Alertas Críticas</h2>
          <div className="space-y-3">
            {(alerts.sustanciasVencidas?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase mb-1">Sustancias Vencidas</p>
                {alerts.sustanciasVencidas!.map((s, i) => (
                  <div key={i} className="text-xs bg-red-50 rounded-lg p-2 border border-red-200 mb-1">
                    <p className="font-medium text-gray-900">{s.nombre_producto}</p>
                    <p className="text-gray-600">{s.laboratorio} · Venció: {s.fecha_vencimiento}</p>
                  </div>
                ))}
              </div>
            )}
            {(alerts.eppVencidos?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase mb-1">EPP Vencidos</p>
                {alerts.eppVencidos!.map((e, i) => (
                  <div key={i} className="text-xs bg-red-50 rounded-lg p-2 border border-red-200 mb-1">
                    <p className="font-medium text-gray-900">{e.elemento_tipo} {e.identificacion ? `· ${e.identificacion}` : ''}</p>
                    <p className="text-gray-600">{e.laboratorio} · Venció: {e.fecha_vencimiento}</p>
                  </div>
                ))}
              </div>
            )}
            {(alerts.sustanciasVencidas?.length ?? 0) === 0 && (alerts.eppVencidos?.length ?? 0) === 0 && (
              <p className="text-sm text-green-600 font-medium">✅ Sin alertas críticas</p>
            )}
          </div>
        </div>

        {/* Próximos vencimientos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">⏰ Próximos Vencimientos (30 días)</h2>
          <div className="space-y-3">
            {(alerts.sustanciasProximas?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Sustancias</p>
                {alerts.sustanciasProximas!.map((s, i) => (
                  <div key={i} className="text-xs bg-amber-50 rounded-lg p-2 border border-amber-200 mb-1">
                    <p className="font-medium text-gray-900">{s.nombre_producto}</p>
                    <p className="text-gray-600">{s.laboratorio} · Vence: {s.fecha_vencimiento}</p>
                  </div>
                ))}
              </div>
            )}
            {(alerts.eppProximos?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase mb-1">EPP</p>
                {alerts.eppProximos!.map((e, i) => (
                  <div key={i} className="text-xs bg-amber-50 rounded-lg p-2 border border-amber-200 mb-1">
                    <p className="font-medium text-gray-900">{e.elemento_tipo} {e.identificacion ? `· ${e.identificacion}` : ''}</p>
                    <p className="text-gray-600">{e.laboratorio} · Vence: {e.fecha_vencimiento}</p>
                  </div>
                ))}
              </div>
            )}
            {(alerts.sustanciasProximas?.length ?? 0) === 0 && (alerts.eppProximos?.length ?? 0) === 0 && (
              <p className="text-sm text-gray-500">Sin vencimientos en los próximos 30 días</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Préstamos activos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">🔑 Préstamos Pendientes</h2>
          {(alerts.prestamosActivos?.length ?? 0) > 0 ? (
            <ul className="space-y-2">
              {alerts.prestamosActivos!.map((p, i) => (
                <li key={i} className="text-xs bg-orange-50 rounded-lg p-2 border border-orange-100">
                  <p className="font-medium text-gray-900">{p.nombre}</p>
                  <p className="text-gray-600">{p.elemento} — {p.laboratorio}</p>
                  <p className="text-orange-600">{new Date(p.fecha_entrega).toLocaleDateString('es-CO')}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Sin préstamos activos</p>
          )}
        </div>

        {/* Actividad reciente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">📋 Actividad Reciente</h2>
            <Link href="/admin/historial" className="text-xs text-blue-600 hover:underline">Ver todo →</Link>
          </div>
          {actividad.length > 0 ? (
            <ul className="space-y-2">
              {actividad.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-xs border-b border-gray-50 pb-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-semibold shrink-0 ${accionColors[a.accion] ?? 'bg-gray-100 text-gray-600'}`}>
                    {a.accion}
                  </span>
                  <div className="min-w-0">
                    <p className="text-gray-900 font-medium truncate">{a.descripcion}</p>
                    <p className="text-gray-500">{a.usuario ?? 'Sistema'} · {fmtDT(a.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Sin actividad registrada aún</p>
          )}
        </div>

      </div>
    </div>
  )
}
