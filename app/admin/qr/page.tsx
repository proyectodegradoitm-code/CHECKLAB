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

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export default function QRPage() {
  const supabase = createClient()
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { setBaseUrl(getBaseUrl()) }, [])

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

  const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')

  const copyUrl = async (url: string, codigo: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const el = document.createElement('textarea')
        el.value = url
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopied(codigo)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // silenciar error si el navegador no permite copiar
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shrink-0">📱</div>
          <div>
            <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Gestión de Códigos QR</h1>
            <p className="text-gray-500 text-sm mt-0.5">Genera y administra QR para cada formulario del laboratorio</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shrink-0"
        >
          + Nuevo QR
        </button>
      </div>

      {/* Advertencia URL localhost */}
      {isLocalhost && baseUrl && (
        <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3.5">
          <span className="text-amber-500 text-lg mt-0.5 shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Los QR apuntan a <code className="bg-amber-100 px-1 rounded">localhost</code> — los celulares no podrán abrirlos</p>
            <p className="text-xs text-amber-700 mt-1">
              Define <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_APP_URL</code> en tu <strong>.env.local</strong> y en Vercel con la URL pública de la app (ej: <code className="bg-amber-100 px-1 rounded">https://tu-app.vercel.app</code>) y reinicia el servidor.
            </p>
          </div>
        </div>
      )}

      {/* URL base activa */}
      {baseUrl && !isLocalhost && (
        <div className="mb-5 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <span className="text-green-500 text-sm">✅</span>
          <p className="text-xs text-green-700">QR apuntan a: <span className="font-mono font-semibold">{baseUrl}</span></p>
        </div>
      )}

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
      {loading || !baseUrl ? (
        <p className="text-gray-400 text-sm">{!baseUrl ? 'Cargando URL base...' : 'Cargando...'}</p>
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
                  <p className="text-sm font-medium text-gray-800">{qr.laboratorio}</p>
                  {qr.descripcion && <p className="text-xs text-gray-400">{qr.descripcion}</p>}
                </div>

                {/* URL visible */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 mb-3">
                  <p className="text-[10px] font-mono text-gray-500 truncate flex-1">{url}</p>
                  <button
                    onClick={() => copyUrl(url, qr.codigo)}
                    className="shrink-0 text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {copied === qr.codigo ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => downloadQR(qr.codigo)}
                    className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg transition-colors"
                  >
                    Descargar SVG
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
