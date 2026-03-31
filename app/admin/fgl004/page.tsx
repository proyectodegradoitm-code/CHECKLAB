'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Prestamo = {
  id: string
  nombre: string
  carnet_cc: string
  laboratorio: string
  elemento: string
  cantidad: number
  fecha_entrega: string
  fecha_devolucion: string | null
  estado: 'activo' | 'devuelto'
  observaciones: string | null
}

export default function FGL004Page() {
  const supabase = createClient()
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'activo' | 'devuelto'>('todos')
  const [search, setSearch] = useState('')

  const fetchPrestamos = async () => {
    let query = supabase.from('fgl_004').select('*').order('created_at', { ascending: false })
    if (filtro !== 'todos') query = query.eq('estado', filtro)
    const { data } = await query
    setPrestamos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPrestamos() }, [filtro])

  const handleDevolucion = async (id: string) => {
    await supabase.from('fgl_004').update({
      estado: 'devuelto',
      fecha_devolucion: new Date().toISOString(),
    }).eq('id', id)
    fetchPrestamos()
  }

  const filtered = prestamos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.carnet_cc.includes(search) ||
    p.elemento.toLowerCase().includes(search.toLowerCase()) ||
    p.laboratorio.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">FGL 004 — Préstamo de Equipos</h1>
        <p className="text-gray-500 text-sm mt-1">Registro de préstamos y devoluciones de equipos, herramientas y EPP</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, documento, elemento..."
          className="flex-1 min-w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          {(['todos', 'activo', 'devuelto'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                filtro === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>
              {f === 'todos' ? 'Todos' : f === 'activo' ? 'Activos' : 'Devueltos'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Solicitante</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Elemento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Laboratorio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">F. Entrega</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">F. Devolución</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Sin registros</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{p.nombre}</p>
                  <p className="text-xs text-gray-400">{p.carnet_cc}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{p.elemento}</p>
                  <p className="text-xs text-gray-400">Cant: {p.cantidad}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{p.laboratorio}</td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(p.fecha_entrega).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {p.fecha_devolucion
                    ? new Date(p.fecha_devolucion).toLocaleDateString('es-CO')
                    : <span className="text-orange-500">Pendiente</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    p.estado === 'activo'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {p.estado === 'activo' ? 'Activo' : 'Devuelto'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.estado === 'activo' && (
                    <button
                      onClick={() => handleDevolucion(p.id)}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg"
                    >
                      Registrar devolución
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
