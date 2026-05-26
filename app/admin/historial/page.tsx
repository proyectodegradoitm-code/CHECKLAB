'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { ORG_ID } from '@/lib/org'

type Entrada = {
  id: string
  tabla: string
  registro_id: string | null
  accion: string
  descripcion: string
  usuario: string | null
  laboratorio: string | null
  datos: Record<string, unknown> | null
  created_at: string
}

const fmtDT = (d: string) =>
  new Date(d).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })

const accionColor: Record<string, string> = {
  crear:     'bg-green-100 text-green-700',
  editar:    'bg-blue-100 text-blue-700',
  eliminar:  'bg-red-100 text-red-700',
  devolucion:'bg-purple-100 text-purple-700',
}

const tablaLabel: Record<string, string> = {
  fgl_004: 'FGL-004 Préstamos',
  fgl_010: 'FGL-010 Sustancias',
  fgl_140: 'FGL-140 EPP',
}

export default function HistorialPage() {
  const supabase = createClient()
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTabla, setFiltroTabla] = useState('todas')
  const [filtroAccion, setFiltroAccion] = useState('todas')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchHistorial = async () => {
    setLoading(true)
    let query = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(500)
    if (filtroTabla !== 'todas') query = query.eq('tabla', filtroTabla)
    if (filtroAccion !== 'todas') query = query.eq('accion', filtroAccion)
    if (ORG_ID) query = query.eq('organizacion_id', ORG_ID)
    const { data } = await query
    setEntradas(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchHistorial() }, [filtroTabla, filtroAccion])

  const filtered = entradas.filter(e => {
    const matchSearch =
      (e.descripcion ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.usuario ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.laboratorio ?? '').toLowerCase().includes(search.toLowerCase())
    const cr = e.created_at?.split('T')[0] ?? ''
    const matchFrom = !dateFrom || cr >= dateFrom
    const matchTo = !dateTo || cr <= dateTo
    return matchSearch && matchFrom && matchTo
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historial de Cambios</h1>
        <p className="text-gray-600 text-sm mt-1">Registro de todas las acciones realizadas en el sistema</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por descripción, usuario, laboratorio..."
          className="flex-1 min-w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={filtroTabla} onChange={e => setFiltroTabla(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="todas">Todos los formularios</option>
          <option value="fgl_004">FGL-004 Préstamos</option>
          <option value="fgl_010">FGL-010 Sustancias</option>
          <option value="fgl_140">FGL-140 EPP</option>
        </select>
        <select value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="todas">Todas las acciones</option>
          <option value="crear">Crear</option>
          <option value="editar">Editar</option>
          <option value="eliminar">Eliminar</option>
          <option value="devolucion">Devolución</option>
        </select>
      </div>

      {/* Rango de fechas */}
      <div className="flex flex-wrap items-center gap-3 mb-5 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <span className="text-xs font-semibold text-gray-600 uppercase">Rango de fecha:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-gray-400">—</span>
        <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-blue-600 hover:underline">Limpiar</button>
        )}
        <span className="ml-auto text-xs text-gray-500">{filtered.length} registros</span>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha y Hora</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Formulario</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Descripción</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Laboratorio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Sin registros en el historial</td></tr>
            ) : filtered.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDT(e.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${accionColor[e.accion] ?? 'bg-gray-100 text-gray-600'}`}>
                    {e.accion}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">{tablaLabel[e.tabla] ?? e.tabla}</td>
                <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{e.descripcion}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{e.laboratorio ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[150px]">{e.usuario ?? 'Sistema'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
