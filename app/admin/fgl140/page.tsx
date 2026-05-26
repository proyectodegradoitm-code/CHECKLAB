'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import FormFGL140 from '@/components/forms/FormFGL140'
import { downloadExcelFGL140 } from '@/lib/excel-templates'
import { ORG_ID } from '@/lib/org'

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

type EditForm = {
  elemento_tipo: string
  identificacion: string
  fecha_revision: string
  fecha_vencimiento: string
  estado: string
  periodicidad: string
  revisado_por: string
  observaciones: string
}

const ELEMENTO_LABELS: Record<string, string> = {
  ducha: '🚿 Ducha de emergencia', extintor: '🧯 Extintor', botiquin: '🩺 Botiquín',
  kit_derrames: '🪣 Kit derrames', kit_hidrocarburos: '🛢️ Kit hidrocarburos', kit_mercurio: '⚗️ Kit mercurio',
}
const PERIODICIDAD_LABELS: Record<string, string> = {
  '15_dias': '15 días', '1_mes': '1 mes', '2_meses': '2 meses', anual: 'Anual',
}
const today = new Date().toISOString().split('T')[0]

const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtDT = (d: string) => new Date(d).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function downloadCSV(data: ControlEpp[], filename: string) {
  const headers = ['Elemento', 'Laboratorio', 'ID/Placa', 'F. Revisión', 'F. Vencimiento', 'Estado', 'Periodicidad', 'Revisado Por', 'Observaciones', 'Fecha Registro']
  const rows = data.map(r => [
    ELEMENTO_LABELS[r.elemento_tipo] ?? r.elemento_tipo, r.laboratorio, r.identificacion ?? '',
    r.fecha_revision, r.fecha_vencimiento ?? '', r.estado,
    PERIODICIDAD_LABELS[r.periodicidad ?? ''] ?? (r.periodicidad ?? ''),
    r.revisado_por ?? '', r.observaciones ?? '', fmtDT(r.created_at),
  ])
  const csv = [headers, ...rows].map(row => row.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}


function imprimirFormato(data: ControlEpp[]) {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>FGL-140</title>
  <style>body{font-family:Arial,sans-serif;margin:20px;color:#111;font-size:11px}h1{text-align:center;font-size:15px;margin-bottom:4px}.sub{text-align:center;font-size:10px;color:#555;margin-bottom:14px}table{width:100%;border-collapse:collapse}th{background:#15803d;color:#fff;padding:5px 6px;text-align:left;font-size:10px}td{padding:4px 6px;border-bottom:1px solid #e5e7eb;font-size:10px}tr:nth-child(even) td{background:#f9fafb}.bueno{background:#dcfce7;color:#14532d;padding:2px 5px;border-radius:9999px;font-size:9px;font-weight:bold}.regular{background:#fef9c3;color:#713f12;padding:2px 5px;border-radius:9999px;font-size:9px;font-weight:bold}.malo{background:#fee2e2;color:#7f1d1d;padding:2px 5px;border-radius:9999px;font-size:9px;font-weight:bold}.vencida{color:#dc2626;font-weight:bold}@media print{body{margin:0}}</style>
  </head><body>
  <h1>FGL-140 — Control de Elementos de Actuación y Protección</h1>
  <p class="sub">Generado: ${new Date().toLocaleString('es-CO')} | Total: ${data.length}</p>
  <table><thead><tr><th>Elemento</th><th>Laboratorio</th><th>ID</th><th>F. Revisión</th><th>F. Vencimiento</th><th>Estado</th><th>Periodicidad</th><th>Revisado Por</th><th>Fecha Registro</th></tr></thead>
  <tbody>${data.map(r => {
    const vencida = r.fecha_vencimiento && new Date(r.fecha_vencimiento) <= new Date()
    return `<tr><td>${ELEMENTO_LABELS[r.elemento_tipo] ?? r.elemento_tipo}</td><td>${r.laboratorio}</td><td>${r.identificacion ?? '—'}</td><td>${r.fecha_revision}</td><td class="${vencida ? 'vencida' : ''}">${r.fecha_vencimiento ?? '—'}</td><td><span class="${r.estado}">${r.estado}</span></td><td>${PERIODICIDAD_LABELS[r.periodicidad ?? ''] ?? (r.periodicidad ?? '—')}</td><td>${r.revisado_por ?? '—'}</td><td>${fmtDT(r.created_at)}</td></tr>`
  }).join('')}</tbody></table>
  <script>window.onload=()=>window.print()</script></body></html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'width=1000,height=700')
  setTimeout(() => URL.revokeObjectURL(url), 15000)
}

export default function FGL140Page() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<ControlEpp[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [userEmail, setUserEmail] = useState('')

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editRecord, setEditRecord] = useState<ControlEpp | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ elemento_tipo: '', identificacion: '', fecha_revision: today, fecha_vencimiento: '', estado: 'bueno', periodicidad: '1_mes', revisado_por: '', observaciones: '' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [addLab, setAddLab] = useState('')
  const [addLabCustom, setAddLabCustom] = useState('')
  const [labs, setLabs] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [dlDateFrom, setDlDateFrom] = useState('')
  const [dlDateTo, setDlDateTo] = useState('')
  const [showDlPanel, setShowDlPanel] = useState(false)

  const fetchRegistros = async () => {
    setLoading(true)
    let query = supabase.from('fgl_140').select('*').order('fecha_revision', { ascending: false })
    if (filtroTipo !== 'todos') query = query.eq('elemento_tipo', filtroTipo)
    if (ORG_ID) query = query.eq('organizacion_id', ORG_ID)
    const { data } = await query
    setRegistros(data ?? [])
    setLoading(false)
  }

  const fetchLabs = async () => {
    let query = supabase.from('qr_codes').select('laboratorio').order('laboratorio')
    if (ORG_ID) query = query.eq('organizacion_id', ORG_ID)
    const { data } = await query
    if (data) setLabs([...new Set(data.map((d: { laboratorio: string }) => d.laboratorio))])
  }

  useEffect(() => { fetchRegistros() }, [filtroTipo])
  useEffect(() => {
    fetchLabs()
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ''))
  }, [])

  const isVencida = (f: string | null) => f ? new Date(f) <= new Date() : false
  const isProxima = (f: string | null) => {
    if (!f) return false
    const diff = new Date(f).getTime() - Date.now()
    return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000
  }

  const filtered = registros.filter(r =>
    r.laboratorio.toLowerCase().includes(search.toLowerCase()) ||
    (r.identificacion ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.revisado_por ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (ELEMENTO_LABELS[r.elemento_tipo] ?? r.elemento_tipo).toLowerCase().includes(search.toLowerCase())
  )

  const openEdit = (r: ControlEpp) => {
    setEditRecord(r)
    setEditForm({ elemento_tipo: r.elemento_tipo, identificacion: r.identificacion ?? '', fecha_revision: r.fecha_revision, fecha_vencimiento: r.fecha_vencimiento ?? '', estado: r.estado, periodicidad: r.periodicidad ?? '1_mes', revisado_por: r.revisado_por ?? '', observaciones: r.observaciones ?? '' })
  }

  const handleEdit = async () => {
    if (!editRecord) return
    setSaving(true)
    await supabase.from('fgl_140').update({
      elemento_tipo: editForm.elemento_tipo, identificacion: editForm.identificacion || null,
      fecha_revision: editForm.fecha_revision, fecha_vencimiento: editForm.fecha_vencimiento || null,
      estado: editForm.estado, periodicidad: editForm.periodicidad || null,
      revisado_por: editForm.revisado_por || null, observaciones: editForm.observaciones || null,
    }).eq('id', editRecord.id)
    await logAudit(supabase, { tabla: 'fgl_140', registro_id: editRecord.id, accion: 'editar', descripcion: `Edición de "${ELEMENTO_LABELS[editForm.elemento_tipo] ?? editForm.elemento_tipo}"`, usuario: userEmail, laboratorio: editRecord.laboratorio })
    setEditRecord(null); setSaving(false); fetchRegistros()
  }

  const handleDelete = async (id: string) => {
    const record = registros.find(r => r.id === id)
    await supabase.from('fgl_140').delete().eq('id', id)
    await logAudit(supabase, { tabla: 'fgl_140', registro_id: id, accion: 'eliminar', descripcion: `Eliminación de "${ELEMENTO_LABELS[record?.elemento_tipo ?? ''] ?? record?.elemento_tipo}"`, usuario: userEmail, laboratorio: record?.laboratorio })
    setDeleteId(null); fetchRegistros()
  }

  const labSeleccionado = addLab === '__custom' ? addLabCustom : addLab
  const setEF = (k: keyof EditForm, v: string) => setEditForm(f => ({ ...f, [k]: v }))
  const dataParaDescarga = registros.filter(r => {
    const cr = r.created_at?.split('T')[0] ?? ''
    return (!dlDateFrom || cr >= dlDateFrom) && (!dlDateTo || cr <= dlDateTo)
  })

  return (
    <div>
      {/* Modal eliminar */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <div className="text-4xl text-center mb-3">🗑️</div>
            <h3 className="font-bold text-gray-900 text-lg text-center mb-2">Eliminar registro</h3>
            <p className="text-gray-600 text-sm text-center mb-6">Esta acción es permanente y no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg text-sm">Eliminar</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Editar Registro EPP</h3>
              <button onClick={() => setEditRecord(null)} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de elemento</label>
                <input value={editForm.elemento_tipo} onChange={e => setEF('elemento_tipo', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ID / Placa</label>
                  <input value={editForm.identificacion} onChange={e => setEF('identificacion', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Periodicidad</label>
                  <input value={editForm.periodicidad} onChange={e => setEF('periodicidad', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha revisión</label>
                  <input type="date" value={editForm.fecha_revision} max={today} onChange={e => setEF('fecha_revision', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha vencimiento</label>
                  <input type="date" value={editForm.fecha_vencimiento} onChange={e => setEF('fecha_vencimiento', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Estado</label>
                <div className="flex gap-2">
                  {[{ v: 'bueno', label: '✅ Bueno', cls: 'bg-green-600' }, { v: 'regular', label: '⚠️ Regular', cls: 'bg-yellow-500' }, { v: 'malo', label: '❌ Malo', cls: 'bg-red-600' }].map(opt => (
                    <button key={opt.v} type="button" onClick={() => setEF('estado', opt.v)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${editForm.estado === opt.v ? `${opt.cls} text-white border-transparent` : 'bg-white text-gray-700 border-gray-300'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Revisado por</label>
                <input value={editForm.revisado_por} onChange={e => setEF('revisado_por', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={editForm.observaciones} onChange={e => setEF('observaciones', e.target.value)}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={handleEdit} disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 rounded-lg text-sm">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button onClick={() => setEditRecord(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal entrada manual */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Nuevo Registro Manual — FGL-140</h3>
              <button onClick={() => { setShowAddModal(false); setAddLab(''); setAddLabCustom('') }} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Laboratorio *</label>
                <select value={addLab} onChange={e => setAddLab(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar laboratorio</option>
                  {labs.map(l => <option key={l} value={l}>{l}</option>)}
                  <option value="__custom">✏️ Otro (escribir)</option>
                </select>
                {addLab === '__custom' && (
                  <input value={addLabCustom} onChange={e => setAddLabCustom(e.target.value)} placeholder="Nombre del laboratorio"
                    className="mt-2 w-full border border-blue-400 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                )}
              </div>
              {labSeleccionado && (
                <FormFGL140 qrCodigo="ADMIN-MANUAL" laboratorio={labSeleccionado}
                  onSuccess={async () => {
                    await logAudit(supabase, { tabla: 'fgl_140', accion: 'crear', descripcion: `Registro manual en ${labSeleccionado}`, usuario: userEmail, laboratorio: labSeleccionado })
                    setShowAddModal(false); setAddLab(''); setAddLabCustom(''); fetchRegistros()
                  }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FGL 140 — Control Elementos de Actuación y Protección</h1>
          <p className="text-gray-600 text-sm mt-1">Revisiones periódicas de EPP, extintores, botiquines y kits de derrames</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Nuevo Registro
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar laboratorio, elemento, responsable..."
          className="flex-1 min-w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Elemento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Laboratorio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">F. Revisión</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">F. Vencimiento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Revisado por</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Periodicidad</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha Registro</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-gray-500">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-gray-500">Sin registros</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className={`hover:bg-gray-50 ${isVencida(r.fecha_vencimiento) ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-900">{ELEMENTO_LABELS[r.elemento_tipo] ?? r.elemento_tipo}</td>
                <td className="px-4 py-3 text-gray-700">{r.laboratorio}</td>
                <td className="px-4 py-3 text-gray-600">{r.identificacion ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">{fmt(r.fecha_revision)}</td>
                <td className="px-4 py-3">
                  {r.fecha_vencimiento ? (
                    <span className={`text-xs font-semibold ${isVencida(r.fecha_vencimiento) ? 'text-red-600' : isProxima(r.fecha_vencimiento) ? 'text-yellow-600' : 'text-gray-700'}`}>
                      {isVencida(r.fecha_vencimiento) ? '⚠️ ' : isProxima(r.fecha_vencimiento) ? '⏰ ' : ''}{fmt(r.fecha_vencimiento)}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.estado === 'bueno' ? 'bg-green-100 text-green-700' : r.estado === 'regular' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {r.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{r.revisado_por ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{PERIODICIDAD_LABELS[r.periodicidad ?? ''] ?? (r.periodicidad ?? '—')}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDT(r.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors">Editar</button>
                    <button onClick={() => setDeleteId(r.id)} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Descarga */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <button onClick={() => setShowDlPanel(!showDlPanel)} className="text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2">
          ⬇️ Opciones de descarga {showDlPanel ? '▲' : '▼'}
        </button>
        {showDlPanel && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Desde (fecha registro)</label>
              <input type="date" value={dlDateFrom} onChange={e => setDlDateFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Hasta (fecha registro)</label>
              <input type="date" value={dlDateTo} min={dlDateFrom} onChange={e => setDlDateTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={() => downloadCSV(dataParaDescarga, `FGL-140_${new Date().toISOString().split('T')[0]}.csv`)} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">CSV</button>
            <button onClick={() => downloadExcelFGL140(dataParaDescarga, `FGL-140_${new Date().toISOString().split('T')[0]}.xlsx`)} className="bg-green-800 hover:bg-green-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Excel (Formato oficial)</button>
            <button onClick={() => imprimirFormato(dataParaDescarga)} className="bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Imprimir / PDF</button>
          </div>
        )}
      </div>
    </div>
  )
}
