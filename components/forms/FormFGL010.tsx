'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ORG_ID } from '@/lib/org'

const today = new Date().toISOString().split('T')[0]

type Props = {
  qrCodigo: string
  laboratorio: string
  organizacionId?: string
  onSuccess?: () => void
}

export default function FormFGL010({ qrCodigo, laboratorio, organizacionId, onSuccess }: Props) {
  const supabase = createClient()
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre_producto: '',
    cas: '',
    cantidad_actual: '',
    unidad: '',
    unidad_otra: '',
    ubicacion: '',
    fecha_vencimiento: '',
    peligrosidad: '',
    sustancia_controlada: false,
    sustancia_cancerigena: false,
    observaciones: '',
    registrado_por: '',
  })

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate fecha_vencimiento for controlled substances
    if (form.sustancia_controlada && form.fecha_vencimiento && form.fecha_vencimiento < today) {
      setError('La fecha de vencimiento de una sustancia controlada no puede ser una fecha pasada.')
      setLoading(false)
      return
    }

    const unidadFinal = form.unidad === 'otra' ? form.unidad_otra.trim() : form.unidad

    const { error: err } = await supabase.from('fgl_010').insert([{
      qr_codigo: qrCodigo,
      laboratorio,
      nombre_producto: form.nombre_producto,
      cas: form.cas || null,
      cantidad_actual: form.cantidad_actual ? parseFloat(form.cantidad_actual) : null,
      unidad: unidadFinal || null,
      ubicacion: form.ubicacion || null,
      fecha_vencimiento: form.fecha_vencimiento || null,
      peligrosidad: form.peligrosidad || null,
      sustancia_controlada: form.sustancia_controlada,
      sustancia_cancerigena: form.sustancia_cancerigena,
      observaciones: form.observaciones || null,
      registrado_por: form.registrado_por || null,
      organizacion_id: organizacionId || ORG_ID || null,
    }])

    if (err) setError('Error al guardar. Intenta de nuevo.')
    else {
      setEnviado(true)
      onSuccess?.()
    }
    setLoading(false)
  }

  const resetForm = () => {
    setEnviado(false)
    setForm({
      nombre_producto: '',
      cas: '',
      cantidad_actual: '',
      unidad: '',
      unidad_otra: '',
      ubicacion: '',
      fecha_vencimiento: '',
      peligrosidad: '',
      sustancia_controlada: false,
      sustancia_cancerigena: false,
      observaciones: '',
      registrado_por: '',
    })
  }

  if (enviado) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="text-lg font-bold text-gray-900">¡Registro exitoso!</h2>
        <p className="text-sm text-gray-600 mt-1">Sustancia registrada correctamente en el inventario.</p>
        <button onClick={resetForm} className="mt-5 text-sm text-blue-600 hover:underline">
          Registrar otra
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del producto *</label>
        <input required value={form.nombre_producto} onChange={e => set('nombre_producto', e.target.value)}
          placeholder="Ej: Ácido sulfúrico"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Número CAS</label>
          <input value={form.cas} onChange={e => set('cas', e.target.value)}
            placeholder="Ej: 7664-93-9"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Ubicación</label>
          <input value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)}
            placeholder="Ej: Estante A-3"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad actual</label>
          <input type="number" step="0.01" min="0" value={form.cantidad_actual}
            onChange={e => set('cantidad_actual', e.target.value)}
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Unidad</label>
          <select value={form.unidad} onChange={e => set('unidad', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">—</option>
            <option value="mL">mL</option>
            <option value="L">L</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="mg">mg</option>
            <option value="unidad">Unidad</option>
            <option value="otra">✏️ Otra</option>
          </select>
          {form.unidad === 'otra' && (
            <input
              value={form.unidad_otra}
              onChange={e => set('unidad_otra', e.target.value)}
              placeholder="Especifique la unidad"
              className="mt-2 w-full border border-blue-400 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Fecha de vencimiento
          {form.sustancia_controlada && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type="date"
          value={form.fecha_vencimiento}
          min={form.sustancia_controlada ? today : undefined}
          onChange={e => set('fecha_vencimiento', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {form.sustancia_controlada && (
          <p className="text-xs text-amber-600 mt-1">Las sustancias controladas requieren fecha de vencimiento vigente.</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Peligrosidad (SGA)</label>
        <input value={form.peligrosidad} onChange={e => set('peligrosidad', e.target.value)}
          placeholder="Ej: Corrosivo, Inflamable"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
          <input type="checkbox" checked={form.sustancia_controlada}
            onChange={e => set('sustancia_controlada', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600" />
          Sustancia controlada
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
          <input type="checkbox" checked={form.sustancia_cancerigena}
            onChange={e => set('sustancia_cancerigena', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600" />
          Cancerígena (IARC)
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Registrado por</label>
        <input value={form.registrado_por} onChange={e => set('registrado_por', e.target.value)}
          placeholder="Nombre del funcionario que registra"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
        <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
          rows={2} placeholder="Observaciones opcionales"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors">
        {loading ? 'Guardando...' : 'Registrar Sustancia'}
      </button>
    </form>
  )
}
