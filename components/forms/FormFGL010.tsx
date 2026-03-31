'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function FormFGL010({ qrCodigo, laboratorio }: { qrCodigo: string; laboratorio: string }) {
  const supabase = createClient()
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre_producto: '',
    cas: '',
    cantidad_actual: '',
    unidad: '',
    ubicacion: '',
    fecha_vencimiento: '',
    peligrosidad: '',
    sustancia_controlada: false,
    sustancia_cancerigena: false,
    observaciones: '',
  })

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('fgl_010').insert([{
      qr_codigo: qrCodigo,
      laboratorio,
      nombre_producto: form.nombre_producto,
      cas: form.cas || null,
      cantidad_actual: form.cantidad_actual ? parseFloat(form.cantidad_actual) : null,
      unidad: form.unidad || null,
      ubicacion: form.ubicacion || null,
      fecha_vencimiento: form.fecha_vencimiento || null,
      peligrosidad: form.peligrosidad || null,
      sustancia_controlada: form.sustancia_controlada,
      sustancia_cancerigena: form.sustancia_cancerigena,
      observaciones: form.observaciones || null,
    }])

    if (err) setError('Error al guardar. Intenta de nuevo.')
    else setEnviado(true)
    setLoading(false)
  }

  if (enviado) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="text-lg font-bold text-gray-800">¡Registro exitoso!</h2>
        <p className="text-sm text-gray-500 mt-1">Sustancia registrada correctamente en el inventario.</p>
        <button onClick={() => { setEnviado(false); setForm({ nombre_producto: '', cas: '', cantidad_actual: '', unidad: '', ubicacion: '', fecha_vencimiento: '', peligrosidad: '', sustancia_controlada: false, sustancia_cancerigena: false, observaciones: '' }) }}
          className="mt-5 text-sm text-blue-600 hover:underline">
          Registrar otra
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del producto *</label>
        <input required value={form.nombre_producto} onChange={e => set('nombre_producto', e.target.value)}
          placeholder="Ej: Ácido sulfúrico"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Número CAS</label>
          <input value={form.cas} onChange={e => set('cas', e.target.value)}
            placeholder="Ej: 7664-93-9"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ubicación</label>
          <input value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)}
            placeholder="Ej: Estante A-3"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad actual</label>
          <input type="number" step="0.01" value={form.cantidad_actual} onChange={e => set('cantidad_actual', e.target.value)}
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
          <select value={form.unidad} onChange={e => set('unidad', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">—</option>
            <option value="mL">mL</option>
            <option value="L">L</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="mg">mg</option>
            <option value="unidad">Unidad</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de vencimiento</label>
        <input type="date" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Peligrosidad (SGA)</label>
        <input value={form.peligrosidad} onChange={e => set('peligrosidad', e.target.value)}
          placeholder="Ej: Corrosivo, Inflamable"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.sustancia_controlada}
            onChange={e => set('sustancia_controlada', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600" />
          Sustancia controlada
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.sustancia_cancerigena}
            onChange={e => set('sustancia_cancerigena', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600" />
          Cancerígena (IARC)
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
        <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
          rows={2} placeholder="Observaciones opcionales"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors">
        {loading ? 'Guardando...' : 'Registrar Sustancia'}
      </button>
    </form>
  )
}
