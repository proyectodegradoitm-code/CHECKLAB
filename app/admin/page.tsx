import { createClient } from '@/lib/supabase-server'

async function getStats() {
  const supabase = await createClient()
  const today = new Date().toISOString()
  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { count: totalPrestamos },
    { count: prestamosActivos },
    { count: totalSustancias },
    { count: sustanciasVencen },
    { count: totalEpp },
    { count: eppVencen },
    { count: totalQr },
  ] = await Promise.all([
    supabase.from('fgl_004').select('*', { count: 'exact', head: true }),
    supabase.from('fgl_004').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
    supabase.from('fgl_010').select('*', { count: 'exact', head: true }),
    supabase.from('fgl_010').select('*', { count: 'exact', head: true }).lte('fecha_vencimiento', in30days).not('fecha_vencimiento', 'is', null),
    supabase.from('fgl_140').select('*', { count: 'exact', head: true }),
    supabase.from('fgl_140').select('*', { count: 'exact', head: true }).lte('fecha_vencimiento', in30days).not('fecha_vencimiento', 'is', null),
    supabase.from('qr_codes').select('*', { count: 'exact', head: true }).eq('activo', true),
  ])

  return { totalPrestamos, prestamosActivos, totalSustancias, sustanciasVencen, totalEpp, eppVencen, totalQr }
}

async function getAlerts() {
  const supabase = await createClient()
  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { data: prestamosActivos },
    { data: sustanciasVence },
    { data: eppVence },
  ] = await Promise.all([
    supabase.from('fgl_004').select('nombre, elemento, laboratorio, fecha_entrega').eq('estado', 'activo').order('fecha_entrega').limit(5),
    supabase.from('fgl_010').select('nombre_producto, laboratorio, fecha_vencimiento').lte('fecha_vencimiento', in30days).not('fecha_vencimiento', 'is', null).order('fecha_vencimiento').limit(5),
    supabase.from('fgl_140').select('laboratorio, elemento_tipo, identificacion, fecha_vencimiento').lte('fecha_vencimiento', in30days).not('fecha_vencimiento', 'is', null).order('fecha_vencimiento').limit(5),
  ])

  return { prestamosActivos, sustanciasVence, eppVence }
}

export default async function AdminDashboard() {
  const [stats, alerts] = await Promise.all([getStats(), getAlerts()])

  const statCards = [
    { label: 'QR Activos', value: stats.totalQr ?? 0, color: 'bg-blue-500', icon: '📱' },
    { label: 'Préstamos Activos', value: stats.prestamosActivos ?? 0, color: 'bg-orange-500', icon: '🔑', alert: (stats.prestamosActivos ?? 0) > 0 },
    { label: 'Sustancias Registradas', value: stats.totalSustancias ?? 0, color: 'bg-purple-500', icon: '🧪' },
    { label: 'Sustancias por Vencer', value: stats.sustanciasVencen ?? 0, color: 'bg-red-500', icon: '⚠️', alert: (stats.sustanciasVencen ?? 0) > 0 },
    { label: 'Registros EPP', value: stats.totalEpp ?? 0, color: 'bg-green-500', icon: '🦺' },
    { label: 'EPP por Vencer', value: stats.eppVencen ?? 0, color: 'bg-yellow-500', icon: '⏰', alert: (stats.eppVencen ?? 0) > 0 },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Control</h1>
        <p className="text-gray-500 text-sm mt-1">Laboratorios de Docencia e Investigación — ITM</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className={`bg-white rounded-xl shadow-sm border p-5 ${card.alert ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className={`text-3xl font-bold mt-1 ${card.alert ? 'text-red-600' : 'text-gray-800'}`}>
                  {card.value}
                </p>
              </div>
              <span className="text-3xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Préstamos activos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>🔑</span> Préstamos Pendientes
          </h2>
          {alerts.prestamosActivos && alerts.prestamosActivos.length > 0 ? (
            <ul className="space-y-2">
              {alerts.prestamosActivos.map((p, i) => (
                <li key={i} className="text-xs bg-orange-50 rounded-lg p-2 border border-orange-100">
                  <p className="font-medium text-gray-700">{p.nombre}</p>
                  <p className="text-gray-500">{p.elemento} — {p.laboratorio}</p>
                  <p className="text-orange-600">{new Date(p.fecha_entrega).toLocaleDateString('es-CO')}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Sin préstamos activos</p>
          )}
        </div>

        {/* Sustancias por vencer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>🧪</span> Sustancias por Vencer
          </h2>
          {alerts.sustanciasVence && alerts.sustanciasVence.length > 0 ? (
            <ul className="space-y-2">
              {alerts.sustanciasVence.map((s, i) => (
                <li key={i} className="text-xs bg-red-50 rounded-lg p-2 border border-red-100">
                  <p className="font-medium text-gray-700">{s.nombre_producto}</p>
                  <p className="text-gray-500">{s.laboratorio}</p>
                  <p className="text-red-600">Vence: {s.fecha_vencimiento}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Sin vencimientos próximos</p>
          )}
        </div>

        {/* EPP por vencer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>🦺</span> EPP por Vencer
          </h2>
          {alerts.eppVence && alerts.eppVence.length > 0 ? (
            <ul className="space-y-2">
              {alerts.eppVence.map((e, i) => (
                <li key={i} className="text-xs bg-yellow-50 rounded-lg p-2 border border-yellow-100">
                  <p className="font-medium text-gray-700">{e.elemento_tipo} {e.identificacion ? `— ${e.identificacion}` : ''}</p>
                  <p className="text-gray-500">{e.laboratorio}</p>
                  <p className="text-yellow-700">Vence: {e.fecha_vencimiento}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Sin vencimientos próximos</p>
          )}
        </div>

      </div>
    </div>
  )
}
