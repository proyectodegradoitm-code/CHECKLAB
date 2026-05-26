'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ORG_ID } from '@/lib/org'

type Props = { qrCodigo: string; laboratorio: string; organizacionId?: string; onSuccess?: () => void }

export default function FormFGL004({ qrCodigo, laboratorio, organizacionId, onSuccess }: Props) {
  const supabase = createClient()
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    carnet_cc: '',
    elemento: '',
    cantidad: 1,
    tipo: 'prestamo',
    observaciones: '',
  })

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload: Record<string, unknown> = {
      qr_codigo: qrCodigo,
      laboratorio,
      nombre: form.nombre,
      carnet_cc: form.carnet_cc,
      elemento: form.elemento,
      cantidad: form.cantidad,
      observaciones: form.observaciones || null,
      organizacion_id: organizacionId || ORG_ID || null,
    }

    if (form.tipo === 'devolucion') {
      payload.estado = 'devuelto'
      payload.fecha_devolucion = new Date().toISOString()
    }

    const { error: err } = await supabase.from('fgl_004').insert([payload])

    if (err) {
      setError('Error al guardar. Intenta de nuevo.')
    } else {
      setEnviado(true)
      onSuccess?.()
    }
    setLoading(false)
  }

  if (enviado) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="text-lg font-bold text-gray-800">¡Registro exitoso!</h2>
        <p className="text-sm text-gray-500 mt-1">
          {form.tipo === 'prestamo' ? 'Préstamo registrado correctamente.' : 'Devolución registrada correctamente.'}
        </p>
        <button
          onClick={() => { setEnviado(false); setForm({ nombre: '', carnet_cc: '', elemento: '', cantidad: 1, tipo: 'prestamo', observaciones: '' }) }}
          className="mt-5 text-sm text-blue-600 hover:underline"
        >
          Registrar otro
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo */}
      <div className="flex gap-3">
        {['prestamo', 'devolucion'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => set('tipo', t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
              form.tipo === t
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t === 'prestamo' ? '🔑 Préstamo' : '↩️ Devolución'}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo *</label>
        <input required value={form.nombre} onChange={e => set('nombre', e.target.value)}
          placeholder="Nombre del solicitante"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Carné / CC *</label>
        <input required value={form.carnet_cc} onChange={e => set('carnet_cc', e.target.value)}
          placeholder="Número de documento"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Elemento / Equipo *</label>
        <input required value={form.elemento} onChange={e => set('elemento', e.target.value)}
          placeholder="Nombre del equipo o herramienta"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
        <input type="number" min={1} value={form.cantidad} onChange={e => set('cantidad', parseInt(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
        <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
          rows={2} placeholder="Observaciones opcionales"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors">
        {loading ? 'Guardando...' : `Registrar ${form.tipo === 'prestamo' ? 'Préstamo' : 'Devolución'}`}
      </button>
    </form>
  )
}
