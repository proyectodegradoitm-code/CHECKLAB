'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import { ORG_ID } from '@/lib/org'

type QRCode = {
  id: string
  codigo: string
  tipo: string
  descripcion: string
  laboratorio: string
  activo: boolean
  created_at: string
}

const tipoLabels: Record<string, string> = {
  fgl004: 'FGL 004 — Préstamo',
  fgl010: 'FGL 010 — Inventario',
  fgl140: 'FGL 140 — Control EPP',
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')

export default function QRPage() {
  const supabase = createClient()
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    tipo: 'fgl004',
    descripcion: '',
    laboratorio: '',
  })

  const fetchQR = async () => {
    let query = supabase.from('qr_codes').select('*').order('created_at', { ascending: false })
    if (ORG_ID) query = query.eq('organizacion_id', ORG_ID)
    const { data } = await query
    setQrCodes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchQR() }, [])

  const handleCreate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreating(true)
    const codigo = `${form.tipo}-${Date.now()}`
    const { error } = await supabase.from('qr_codes').insert([{
      codigo,
      tipo: form.tipo,
      descripcion: form.descripcion,
      laboratorio: form.laboratorio,
      organizacion_id: ORG_ID || null,
    }])
    if (!error) {
      setForm({ tipo: 'fgl004', descripcion: '', laboratorio: '' })
      setShowForm(false)
      fetchQR()
    }
    setCreating(false)
  }

  const handleToggle = async (qr: QRCode) => {
    await supabase.from('qr_codes').update({ activo: !qr.activo }).eq('id', qr.id)
    fetchQR()
  }

  const downloadQR = (codigo: string) => {
    const svg = document.getElementById(`qr-${codigo}`)
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `QR-${codigo}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Códigos QR</h1>
          <p className="text-gray-500 text-sm mt-1">Genera y administra QR para cada formulario</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo QR
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Crear nuevo código QR</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de formulario</label>
              <select
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fgl004">FGL 004 — Préstamo</option>
                <option value="fgl010">FGL 010 — Inventario</option>
                <option value="fgl140">FGL 140 — Control EPP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Laboratorio</label>
              <input
                required
                value={form.laboratorio}
                onChange={e => setForm({ ...form, laboratorio: e.target.value })}
                placeholder="Ej: Lab. Biomédica"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción (opcional)</label>
              <input
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Ej: Equipos de medición"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-5 py-2 rounded-lg">
              {creating ? 'Generando...' : 'Generar QR'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-gray-600 hover:text-gray-800 text-sm px-4 py-2">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* QR List */}
      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map(qr => {
            const url = `${baseUrl}/f/${qr.codigo}`
            return (
              <div key={qr.id}
                className={`bg-white rounded-xl border p-5 shadow-sm ${qr.activo ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>

                {/* QR Code */}
                <div className="flex justify-center mb-4">
                  <QRCodeSVG
                    id={`qr-${qr.codigo}`}
                    value={url}
                    size={140}
                    level="M"
                    marginSize={2}
                  />
                </div>

                {/* Info */}
                <div className="mb-3">
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${
                    qr.tipo === 'fgl004' ? 'bg-blue-100 text-blue-700' :
                    qr.tipo === 'fgl010' ? 'bg-purple-100 text-purple-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {tipoLabels[qr.tipo]}
                  </span>
                  <p className="text-sm font-medium text-gray-700">{qr.laboratorio}</p>
                  {qr.descripcion && <p className="text-xs text-gray-400">{qr.descripcion}</p>}
                  <p className="text-xs text-gray-300 mt-1 font-mono truncate">{qr.codigo}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => downloadQR(qr.codigo)}
                    className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg transition-colors"
                  >
                    Descargar
                  </button>
                  <button
                    onClick={() => handleToggle(qr)}
                    className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                      qr.activo
                        ? 'bg-red-50 hover:bg-red-100 text-red-600'
                        : 'bg-green-50 hover:bg-green-100 text-green-600'
                    }`}
                  >
                    {qr.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && qrCodes.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-5xl mb-3">📱</p>
          <p>No hay códigos QR aún. Crea el primero.</p>
        </div>
      )}
    </div>
  )
}
