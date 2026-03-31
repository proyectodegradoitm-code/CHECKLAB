'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Sustancia = {
  id: string
  nombre_producto: string
  cas: string | null
  laboratorio: string
  cantidad_actual: number | null
  unidad: string | null
  ubicacion: string | null
  fecha_vencimiento: string | null
  peligrosidad: string | null
  sustancia_controlada: boolean
  sustancia_cancerigena: boolean
  estado_vigencia: string
  observaciones: string | null
}

export default function FGL010Page() {
  const supabase = createClient()
  const [sustancias, setSustancias] = useState<Sustancia[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<'todas' | 'controlada' | 'cancerigena' | 'vencidas'>('todas')

  const fetchSustancias = async () => {
    let query = supabase.from('fgl_010').select('*').order('nombre_producto')
    if (filtro === 'controlada') query = query.eq('sustancia_controlada', true)
    if (filtro === 'cancerigena') query = query.eq('sustancia_cancerigena', true)
    if (filtro === 'vencidas') {
      const today = new Date().toISOString().split('T')[0]
      query = query.lte('fecha_vencimiento', today).not('fecha_vencimiento', 'is', null)
    }
    const { data } = await query
    setSustancias(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchSustancias() }, [filtro])

  const filtered = sustancias.filter(s =>
    s.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
    (s.cas ?? '').includes(search) ||
    s.laboratorio.toLowerCase().includes(search.toLowerCase())
  )

  const isVencida = (fecha: string | null) => {
    if (!fecha) return false
    return new Date(fecha) <= new Date()
  }

  const isProxima = (fecha: string | null) => {
    if (!fecha) return false
    const diff = new Date(fecha).getTime() - Date.now()
    return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">FGL 010 — Inventario de Sustancias Químicas</h1>
        <p className="text-gray-500 text-sm mt-1">Control de inventario, vencimientos y clasificación de peligrosidad</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, CAS, laboratorio..."
          className="flex-1 min-w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'todas', label: 'Todas' },
            { key: 'controlada', label: 'Controladas' },
            { key: 'cancerigena', label: 'Cancerígenas' },
            { key: 'vencidas', label: 'Vencidas' },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key as typeof filtro)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === f.key ? 'bg-purple-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">CAS</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Laboratorio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vencimiento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Clasificación</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Peligrosidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Sin registros</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className={`hover:bg-gray-50 ${isVencida(s.fecha_vencimiento) ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{s.nombre_producto}</p>
                  {s.ubicacion && <p className="text-xs text-gray-400">{s.ubicacion}</p>}
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.cas ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{s.laboratorio}</td>
                <td className="px-4 py-3">
                  {s.cantidad_actual != null
                    ? `${s.cantidad_actual} ${s.unidad ?? ''}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {s.fecha_vencimiento ? (
                    <span className={`text-xs font-semibold ${
                      isVencida(s.fecha_vencimiento) ? 'text-red-600' :
                      isProxima(s.fecha_vencimiento) ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      {isVencida(s.fecha_vencimiento) ? '⚠️ ' : isProxima(s.fecha_vencimiento) ? '⏰ ' : ''}
                      {s.fecha_vencimiento}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.sustancia_controlada && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Controlada</span>
                    )}
                    {s.sustancia_cancerigena && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Cancerígena</span>
                    )}
                    {!s.sustancia_controlada && !s.sustancia_cancerigena && (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{s.peligrosidad ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
