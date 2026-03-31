'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function FormFGL140({ qrCodigo, laboratorio }: { qrCodigo: string; laboratorio: string }) {
  const supabase = createClient()
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    elemento_tipo: 'ducha',
    identificacion: '',
    fecha_revision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    estado: 'bueno',
    periodicidad: '1_mes',
    revisado_por: '',
    observaciones: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('fgl_140').insert([{
      qr_codigo: qrCodigo,
      laboratorio,
      elemento_tipo: form.elemento_tipo,
      identificacion: form.identificacion || null,
      fecha_revision: form.fecha_revision,
      fecha_vencimiento: form.fecha_vencimiento || null,
      estado: form.estado,
      periodicidad: form.periodicidad,
      revisado_por: form.revisado_por || null,
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
        <h2 className="text-lg font-bold text-gray-800">¡Revisión registrada!</h2>
        <p className="text-sm text-gray-500 mt-1">El control de EPP fue registrado correctamente.</p>
        <button onClick={() => { setEnviado(false); setForm({ elemento_tipo: 'ducha', identificacion: '', fecha_revision: new Date().toISOString().split('T')[0], fecha_vencimiento: '', estado: 'bueno', periodicidad: '1_mes', revisado_por: '', observaciones: '' }) }}
          className="mt-5 text-sm text-blue-600 hover:underline">
          Registrar otro
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Elemento de protección *</label>
        <select required value={form.elemento_tipo} onChange={e => set('elemento_tipo', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="ducha">🚿 Ducha de emergencia y Lavaojos</option>
          <option value="extintor">🧯 Extintor</option>
          <option value="botiquin">🩺 Botiquín de primeros auxilios</option>
          <option value="kit_derrames">🪣 Kit de derrames (ácidos/bases)</option>
          <option value="kit_hidrocarburos">🛢️ Kit derrames hidrocarburos</option>
          <option value="kit_mercurio">⚗️ Kit derrames mercurio</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Identificación / Placa</label>
          <input value={form.identificacion} onChange={e => set('identificacion', e.target.value)}
            placeholder="Ej: EXT-001"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Periodicidad</label>
          <select value={form.periodicidad} onChange={e => set('periodicidad', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="15_dias">15 días</option>
            <option value="1_mes">1 mes</option>
            <option value="2_meses">2 meses</option>
            <option value="anual">Anual</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de revisión *</label>
          <input required type="date" value={form.fecha_revision} onChange={e => set('fecha_revision', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de vencimiento</label>
          <input type="date" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Estado del elemento *</label>
        <div className="flex gap-3">
          {[
            { v: 'bueno', label: '✅ Bueno', color: 'bg-green-600' },
            { v: 'regular', label: '⚠️ Regular', color: 'bg-yellow-500' },
            { v: 'malo', label: '❌ Malo', color: 'bg-red-600' },
          ].map(opt => (
            <button key={opt.v} type="button"
              onClick={() => set('estado', opt.v)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                form.estado === opt.v
                  ? `${opt.color} text-white border-transparent`
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Revisado por</label>
        <input value={form.revisado_por} onChange={e => set('revisado_por', e.target.value)}
          placeholder="Nombre del responsable"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones / Anomalías</label>
        <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
          rows={3} placeholder="Describa anomalías encontradas (si aplica)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors">
        {loading ? 'Guardando...' : 'Registrar Revisión'}
      </button>
    </form>
  )
}
