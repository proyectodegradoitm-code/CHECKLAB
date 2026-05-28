import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? ''

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
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
    s1 = s1.eq('organizacion_id', ORG_ID); s2 = s2.eq('organizacion_id', ORG_ID)
    s3 = s3.eq('organizacion_id', ORG_ID); s4 = s4.eq('organizacion_id', ORG_ID)
    s5 = s5.eq('organizacion_id', ORG_ID); s6 = s6.eq('organizacion_id', ORG_ID)
    s7 = s7.eq('organizacion_id', ORG_ID); s8 = s8.eq('organizacion_id', ORG_ID)
    s9 = s9.eq('organizacion_id', ORG_ID)
  }
  const [
    { count: totalPrestamos }, { count: prestamosActivos },
    { count: totalSustancias }, { count: sustanciasVencidas }, { count: sustanciasProximas },
    { count: totalEpp }, { count: eppVencidos }, { count: eppProximos },
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
    q1 = q1.eq('organizacion_id', ORG_ID); q2 = q2.eq('organizacion_id', ORG_ID)
    q3 = q3.eq('organizacion_id', ORG_ID); q4 = q4.eq('organizacion_id', ORG_ID)
    q5 = q5.eq('organizacion_id', ORG_ID)
  }
  const [
    { data: prestamosActivos }, { data: sustanciasVencidas }, { data: sustanciasProximas },
    { data: eppVencidos }, { data: eppProximos },
  ] = await Promise.all([q1, q2, q3, q4, q5])
  return { prestamosActivos, sustanciasVencidas, sustanciasProximas, eppVencidos, eppProximos }
}

async function getRecentActivity() {
  const supabase = await createClient()
  let query = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(8)
  if (ORG_ID) query = query.eq('organizacion_id', ORG_ID)
  const { data } = await query
  return data ?? []
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-3">{children}</p>
  )
}

type CardStatus = 'normal' | 'warning' | 'critical' | 'accent'

function StatCard({
  label, value, icon, href, status = 'normal', badge,
}: {
  label: string
  value: number
  icon: string
  href: string
  status?: CardStatus
  badge?: string
}) {
  const bg: Record<CardStatus, string> = {
    normal: 'bg-white border-gray-100',
    accent: 'bg-white border-blue-100',
    warning: 'bg-amber-50 border-amber-200',
    critical: 'bg-red-50 border-red-200',
  }
  const numColor: Record<CardStatus, string> = {
    normal: 'text-gray-900',
    accent: 'text-blue-700',
    warning: 'text-amber-600',
    critical: 'text-red-600',
  }
  const iconBg: Record<CardStatus, string> = {
    normal: 'bg-gray-100',
    accent: 'bg-blue-100',
    warning: 'bg-amber-100',
    critical: 'bg-red-100',
  }
  const badgeStyle: Record<CardStatus, string> = {
    normal: '',
    accent: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-700',
    critical: 'bg-red-100 text-red-700',
  }

  return (
    <Link
      href={href}
      className={`group rounded-xl border shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${bg[status]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${iconBg[status]}`}>
          {icon}
        </div>
        {badge && value > 0 && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeStyle[status]}`}>
            {badge}
          </span>
        )}
      </div>
      <p className={`text-[28px] font-bold leading-none ${numColor[status]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1.5 font-medium">{label}</p>
    </Link>
  )
}

const accionConfig: Record<string, { bg: string; label: string }> = {
  crear:     { bg: 'bg-green-100 text-green-700',  label: 'Crear' },
  editar:    { bg: 'bg-blue-100 text-blue-700',    label: 'Editar' },
  eliminar:  { bg: 'bg-red-100 text-red-700',      label: 'Eliminar' },
  devolucion:{ bg: 'bg-purple-100 text-purple-700',label: 'Dev.' },
}

export default async function AdminDashboard() {
  const [stats, alerts, actividad] = await Promise.all([getStats(), getAlerts(), getRecentActivity()])

  const todayStr = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const hasCriticals =
    (alerts.sustanciasVencidas?.length ?? 0) > 0 ||
    (alerts.eppVencidos?.length ?? 0) > 0

  const hasProximos =
    (alerts.sustanciasProximas?.length ?? 0) > 0 ||
    (alerts.eppProximos?.length ?? 0) > 0

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Panel de Control</h1>
          <p className="text-gray-500 text-sm mt-0.5">Laboratorios de Docencia e Investigación — ITM</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm text-gray-500 capitalize">{todayStr}</p>
        </div>
      </div>

      {/* ── Gestión QR & Préstamos ── */}
      <div className="mb-7">
        <SectionLabel>Gestión QR &amp; Préstamos</SectionLabel>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="QR Activos" value={stats.totalQr ?? 0}
            icon="📱" href="/admin/qr" status="accent"
          />
          <StatCard
            label="Préstamos Activos" value={stats.prestamosActivos ?? 0}
            icon="🔑" href="/admin/fgl004"
            status={(stats.prestamosActivos ?? 0) > 0 ? 'warning' : 'normal'}
            badge="Activos"
          />
          <StatCard
            label="Total Préstamos" value={stats.totalPrestamos ?? 0}
            icon="📋" href="/admin/fgl004" status="normal"
          />
        </div>
      </div>

      {/* ── Sustancias Químicas ── */}
      <div className="mb-7">
        <SectionLabel>Sustancias Químicas — FGL 010</SectionLabel>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Sustancias Registradas" value={stats.totalSustancias ?? 0}
            icon="🧪" href="/admin/fgl010" status="accent"
          />
          <StatCard
            label="Sustancias Vencidas" value={stats.sustanciasVencidas ?? 0}
            icon="🚨" href="/admin/fgl010"
            status={(stats.sustanciasVencidas ?? 0) > 0 ? 'critical' : 'normal'}
            badge="Crítico"
          />
          <StatCard
            label="Vencen en 30 días" value={stats.sustanciasProximas ?? 0}
            icon="⚠️" href="/admin/fgl010"
            status={(stats.sustanciasProximas ?? 0) > 0 ? 'warning' : 'normal'}
            badge="Atención"
          />
        </div>
      </div>

      {/* ── Control EPP ── */}
      <div className="mb-8">
        <SectionLabel>Control EPP — FGL 140</SectionLabel>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Registros EPP" value={stats.totalEpp ?? 0}
            icon="🦺" href="/admin/fgl140" status="accent"
          />
          <StatCard
            label="EPP Vencidos" value={stats.eppVencidos ?? 0}
            icon="🚨" href="/admin/fgl140"
            status={(stats.eppVencidos ?? 0) > 0 ? 'critical' : 'normal'}
            badge="Crítico"
          />
          <StatCard
            label="EPP por Vencer" value={stats.eppProximos ?? 0}
            icon="⏰" href="/admin/fgl140"
            status={(stats.eppProximos ?? 0) > 0 ? 'warning' : 'normal'}
            badge="Atención"
          />
        </div>
      </div>

      {/* ── Alertas + Actividad ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Alertas críticas */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-base">🚨</div>
            <h2 className="font-semibold text-gray-900 text-sm">Alertas Críticas</h2>
            {hasCriticals && (
              <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {(alerts.sustanciasVencidas?.length ?? 0) + (alerts.eppVencidos?.length ?? 0)} ítem(s)
              </span>
            )}
          </div>
          <div className="p-4 space-y-2">
            {!hasCriticals && (
              <div className="flex items-center gap-3 px-4 py-3 bg-green-50 rounded-lg border border-green-100">
                <span className="text-green-500">✅</span>
                <p className="text-sm text-green-700 font-medium">Sin alertas críticas — todo en orden</p>
              </div>
            )}
            {(alerts.sustanciasVencidas?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5 px-1">
                  Sustancias vencidas
                </p>
                {alerts.sustanciasVencidas!.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 bg-red-50 rounded-lg border border-red-100 mb-1.5">
                    <span className="text-red-400 mt-0.5 shrink-0">●</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.nombre_producto}</p>
                      <p className="text-xs text-gray-500">{s.laboratorio} · Venció: {fmtDate(s.fecha_vencimiento)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(alerts.eppVencidos?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5 px-1">
                  EPP vencidos
                </p>
                {alerts.eppVencidos!.map((e, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 bg-red-50 rounded-lg border border-red-100 mb-1.5">
                    <span className="text-red-400 mt-0.5 shrink-0">●</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {e.elemento_tipo}{e.identificacion ? ` · ${e.identificacion}` : ''}
                      </p>
                      <p className="text-xs text-gray-500">{e.laboratorio} · Venció: {fmtDate(e.fecha_vencimiento)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Próximos vencimientos + préstamos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-base">⏰</div>
            <h2 className="font-semibold text-gray-900 text-sm">Próximos 30 días &amp; Préstamos</h2>
          </div>
          <div className="p-4 space-y-3">
            {!hasProximos && (alerts.prestamosActivos?.length ?? 0) === 0 && (
              <p className="text-sm text-gray-400 px-1">Sin vencimientos próximos ni préstamos activos</p>
            )}

            {(alerts.prestamosActivos?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1.5 px-1">
                  Préstamos pendientes
                </p>
                {alerts.prestamosActivos!.map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 bg-orange-50 rounded-lg border border-orange-100 mb-1.5">
                    <span className="text-orange-400 mt-0.5 shrink-0">●</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.nombre}</p>
                      <p className="text-xs text-gray-500">{p.elemento} · {p.laboratorio}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded shrink-0">
                      {new Date(p.fecha_entrega).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(alerts.sustanciasProximas?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1.5 px-1">
                  Sustancias por vencer
                </p>
                {alerts.sustanciasProximas!.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50 rounded-lg border border-amber-100 mb-1.5">
                    <span className="text-amber-400 mt-0.5 shrink-0">●</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.nombre_producto}</p>
                      <p className="text-xs text-gray-500">{s.laboratorio} · Vence: {fmtDate(s.fecha_vencimiento)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(alerts.eppProximos?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1.5 px-1">
                  EPP por vencer
                </p>
                {alerts.eppProximos!.map((e, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50 rounded-lg border border-amber-100 mb-1.5">
                    <span className="text-amber-400 mt-0.5 shrink-0">●</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {e.elemento_tipo}{e.identificacion ? ` · ${e.identificacion}` : ''}
                      </p>
                      <p className="text-xs text-gray-500">{e.laboratorio} · Vence: {fmtDate(e.fecha_vencimiento)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base">📋</div>
            <h2 className="font-semibold text-gray-900 text-sm">Actividad Reciente</h2>
          </div>
          <Link href="/admin/historial" className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline">
            Ver historial completo →
          </Link>
        </div>
        {actividad.length > 0 ? (
          <ul className="divide-y divide-gray-50">
            {actividad.map((a) => {
              const cfg = accionConfig[a.accion] ?? { bg: 'bg-gray-100 text-gray-600', label: a.accion }
              return (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${cfg.bg}`}>
                    {cfg.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 font-medium truncate">{a.descripcion}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.usuario ?? 'Sistema'}
                      {a.laboratorio && <span className="text-gray-300"> · {a.laboratorio}</span>}
                      <span className="text-gray-300"> · </span>
                      {fmtDT(a.created_at)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-400">Sin actividad registrada aún</p>
          </div>
        )}
      </div>
    </div>
  )
}
