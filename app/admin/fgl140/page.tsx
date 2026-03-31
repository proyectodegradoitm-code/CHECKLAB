'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type ControlEpp = {
  id: string
  laboratorio: string
  elemento_tipo: string
  identificacion: string | null
  fecha_revision: string
  fecha_vencimiento: string | null
  estado: 'bueno' | 'regular' | 'malo'
  periodicidad: string | null
  revisado_por: string | null
  observaciones: string | null
  created_at: string
}

const elementoLabels: Record<string, string> = {
  ducha: '🚿 Ducha de emergencia',
  extintor: '🧯 Extintor',
  botiquin: '🩺 Botiquín',
  kit_derrames: '🪣 Kit derrames',
  kit_hidrocarburos: '🛢️ Kit hidrocarburos',
  kit_mercurio: '⚗️ Kit mercurio',
}

export default function FGL140Page() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<ControlEpp[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')

  const fetchRegistros = async () => {
    let query = supabase.from('fgl_140').select('*').order('fecha_revision', { ascending: false })
    if (filtroTipo !== 'todos') query = query.eq('elemento_tipo', filtroTipo)
    const { data } = await query
    setRegistros(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchRegistros() }, [filtroTipo])

  const isVencida = (fecha: string | null) => fecha ? new Date(fecha) <= new Date() : false
  const isProxima = (fecha: string | null) => {
    if (!fecha) return false
    const diff = new Date(fecha).getTime() - Date.now()
    return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000
  }

  const filtered = registros.filter(r =>
    r.laboratorio.toLowerCase().includes(search.toLowerCase()) ||
    (r.identificacion ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.revisado_por ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">FGL 140 — Control Elementos de Actuación y Protección</h1>
        <p className="text-gray-500 text-sm mt-1">Revisiones periódicas de EPP, extintores, botiquines y kits de derrames</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar laboratorio, responsable..."
          className="flex-1 min-w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos los elementos</option>
          <option value="ducha">Ducha de emergencia</option>
          <option value="extintor">Extintor</option>
          <option value="botiquin">Botiquín</option>
          <option value="kit_derrames">Kit derrames</option>
          <option value="kit_hidrocarburos">Kit hidrocarburos</option>
          <option value="kit_mercurio">Kit mercurio</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Elemento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Laboratorio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">F. Revisión</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">F. Vencimiento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Revisado por</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Periodicidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">Sin registros</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className={`hover:bg-gray-50 ${isVencida(r.fecha_vencimiento) ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">
                    {elementoLabels[r.elemento_tipo] ?? r.elemento_tipo}
                  </p>
                </td>
                <td className="px-4 py-3 text-gray-600">{r.laboratorio}</td>
                <td className="px-4 py-3 text-gray-500">{r.identificacion ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{r.fecha_revision}</td>
                <td className="px-4 py-3">
                  {r.fecha_vencimiento ? (
                    <span className={`text-xs font-semibold ${
                      isVencida(r.fecha_vencimiento) ? 'text-red-600' :
                      isProxima(r.fecha_vencimiento) ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      {isVencida(r.fecha_vencimiento) ? '⚠️ ' : isProxima(r.fecha_vencimiento) ? '⏰ ' : ''}
                      {r.fecha_vencimiento}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    r.estado === 'bueno' ? 'bg-green-100 text-green-700' :
                    r.estado === 'regular' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {r.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{r.revisado_por ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{r.periodicidad ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
