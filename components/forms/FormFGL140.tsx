'use client'
import { useState, useEffect } from 'react'
import { ORG_ID } from '@/lib/org'

const today = new Date().toISOString().split('T')[0]

type Props = {
  qrCodigo: string
  laboratorio: string
  organizacionId?: string
  onSuccess?: () => void
}

function calcFechaVencimiento(fechaRevision: string, periodicidad: string): string {
  if (!fechaRevision || periodicidad === 'otro' || !periodicidad) return ''
  const d = new Date(fechaRevision + 'T12:00:00')
  switch (periodicidad) {
    case '15_dias': d.setDate(d.getDate() + 15); break
    case '1_mes': d.setMonth(d.getMonth() + 1); break
    case '2_meses': d.setMonth(d.getMonth() + 2); break
    case 'anual': d.setFullYear(d.getFullYear() + 1); break
    default: return ''
  }
  return d.toISOString().split('T')[0]
}

export default function FormFGL140({ qrCodigo, laboratorio, organizacionId, onSuccess }: Props) {
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    elemento_tipo: 'ducha',
    elemento_tipo_otro: '',
    periodicidad: '1_mes',
    periodicidad_otro: '',
    identificacion: '',
    fecha_revision: today,
    fecha_vencimiento: calcFechaVencimiento(today, '1_mes'),
    estado: 'bueno',
    revisado_por: '',
    cedula_revisado: '',
    observaciones: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Auto-calcular fecha_vencimiento cuando cambia periodicidad o fecha_revision
  useEffect(() => {
    if (form.periodicidad !== 'otro') {
      const computed = calcFechaVencimiento(form.fecha_revision, form.periodicidad)
      setForm(f => ({ ...f, fecha_vencimiento: computed }))
    }
  }, [form.periodicidad, form.fecha_revision])

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const elementoFinal =
      form.elemento_tipo === 'otro' ? form.elemento_tipo_otro.trim() : form.elemento_tipo
    const periodicidadFinal =
      form.periodicidad === 'otro' ? form.periodicidad_otro.trim() : form.periodicidad

    if (!elementoFinal) {
      setError('Debe especificar el tipo de elemento de protección.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/public/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tabla: 'fgl_140',
        datos: {
          qr_codigo: qrCodigo,
          laboratorio,
          elemento_tipo: elementoFinal,
          identificacion: form.identificacion || null,
          fecha_revision: form.fecha_revision,
          fecha_vencimiento: form.fecha_vencimiento || null,
          estado: form.estado,
          periodicidad: periodicidadFinal || null,
          revisado_por: form.revisado_por || null,
          cedula_revisado: form.cedula_revisado || null,
          observaciones: form.observaciones || null,
          organizacion_id: organizacionId || ORG_ID || null,
        },
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Error al guardar. Intenta de nuevo.')
    } else {
      setEnviado(true)
      onSuccess?.()
    }
    setLoading(false)
  }

  const resetForm = () => {
    setEnviado(false)
    setForm({
      elemento_tipo: 'ducha',
      elemento_tipo_otro: '',
      periodicidad: '1_mes',
      periodicidad_otro: '',
      identificacion: '',
      fecha_revision: today,
      fecha_vencimiento: calcFechaVencimiento(today, '1_mes'),
      estado: 'bueno',
      revisado_por: '',
      cedula_revisado: '',
      observaciones: '',
    })
  }

  if (enviado) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="text-lg font-bold text-gray-900">¡Revisión registrada!</h2>
        <p className="text-sm text-gray-600 mt-1">El control de EPP fue registrado correctamente.</p>
        <button onClick={resetForm} className="mt-5 text-sm text-blue-600 hover:underline">
          Registrar otro
        </button>
      </div>
    )
  }

  const fechaVencAuto = form.periodicidad !== 'otro'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo de elemento */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Elemento de protección *</label>
        <select required value={form.elemento_tipo} onChange={e => set('elemento_tipo', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="ducha">🚿 Ducha de emergencia y Lavaojos</option>
          <option value="extintor">🧯 Extintor</option>
          <option value="botiquin">🩺 Botiquín de primeros auxilios</option>
          <option value="kit_derrames">🪣 Kit de derrames (ácidos/bases)</option>
          <option value="kit_hidrocarburos">🛢️ Kit derrames hidrocarburos</option>
          <option value="kit_mercurio">⚗️ Kit derrames mercurio</option>
          <option value="otro">✏️ Otro (especificar)</option>
        </select>
        {form.elemento_tipo === 'otro' && (
          <input
            required
            value={form.elemento_tipo_otro}
            onChange={e => set('elemento_tipo_otro', e.target.value)}
            placeholder="Describa el elemento de protección"
            className="mt-2 w-full border border-blue-400 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Identificación / Placa</label>
          <input value={form.identificacion} onChange={e => set('identificacion', e.target.value)}
            placeholder="Ej: EXT-001"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Periodicidad</label>
          <select value={form.periodicidad} onChange={e => set('periodicidad', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="15_dias">15 días</option>
            <option value="1_mes">1 mes</option>
            <option value="2_meses">2 meses</option>
            <option value="anual">Anual</option>
            <option value="otro">✏️ Otro</option>
          </select>
          {form.periodicidad === 'otro' && (
            <input
              value={form.periodicidad_otro}
              onChange={e => set('periodicidad_otro', e.target.value)}
              placeholder="Ej: Semestral"
              className="mt-2 w-full border border-blue-400 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de revisión *</label>
          <input
            required
            type="date"
            value={form.fecha_revision}
            max={today}
            onChange={e => set('fecha_revision', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Fecha de vencimiento
            {fechaVencAuto && <span className="ml-1 text-[10px] text-blue-500 font-normal">calculada automáticamente</span>}
          </label>
          <input
            type="date"
            value={form.fecha_vencimiento}
            min={today}
            readOnly={fechaVencAuto}
            onChange={e => !fechaVencAuto && set('fecha_vencimiento', e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${fechaVencAuto ? 'bg-blue-50 border-blue-200 cursor-not-allowed' : 'border-gray-300'}`} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Estado del elemento *</label>
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
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Revisado por</label>
          <input value={form.revisado_por}
            onChange={e => set('revisado_por', e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ''))}
            placeholder="Nombre del responsable"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Cédula del revisado</label>
          <input value={form.cedula_revisado} inputMode="numeric"
            onChange={e => set('cedula_revisado', e.target.value.replace(/\D/g, ''))}
            placeholder="Número de cédula"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones / Anomalías</label>
        <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
          rows={3} placeholder="Describa anomalías encontradas (si aplica)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors">
        {loading ? 'Guardando...' : 'Registrar Revisión'}
      </button>
    </form>
  )
}
