'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import FormFGL010 from '@/components/forms/FormFGL010'
import { downloadExcelFGL010 } from '@/lib/excel-templates'
import { ORG_ID } from '@/lib/org'

type Sustancia = {
  id: string
  nombre_producto: string
  cas: string | null
  laboratorio: string
  cantidad_actual: number | null
  unidad: string | null
  ubicacion: string | null
  fecha_vencimiento: string | null
  peligrosidad: string | null
  sustancia_controlada: boolean
  sustancia_cancerigena: boolean
  estado_vigencia: string
  observaciones: string | null
  registrado_por: string | null
  created_at: string
}

type EditForm = {
  nombre_producto: string
  cas: string
  cantidad_actual: string
  unidad: string
  ubicacion: string
  fecha_vencimiento: string
  peligrosidad: string
  sustancia_controlada: boolean
  sustancia_cancerigena: boolean
  observaciones: string
  registrado_por: string
}

const today = new Date().toISOString().split('T')[0]

const fmt = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtDT = (d: string) =>
  new Date(d).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function downloadCSV(data: Sustancia[], filename: string) {
  const headers = ['Producto', 'CAS', 'Laboratorio', 'Cantidad', 'Unidad', 'Ubicación', 'F. Vencimiento', 'Peligrosidad', 'Controlada', 'Cancerígena', 'Registrado Por', 'Observaciones', 'Fecha Registro']
  const rows = data.map(s => [
    s.nombre_producto, s.cas ?? '', s.laboratorio,
    s.cantidad_actual != null ? String(s.cantidad_actual) : '', s.unidad ?? '', s.ubicacion ?? '',
    s.fecha_vencimiento ? fmt(s.fecha_vencimiento) : '', s.peligrosidad ?? '',
    s.sustancia_controlada ? 'Sí' : 'No', s.sustancia_cancerigena ? 'Sí' : 'No',
    s.registrado_por ?? '', s.observaciones ?? '', fmtDT(s.created_at),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}


function imprimirFormato(data: Sustancia[]) {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>FGL-010</title>
  <style>body{font-family:Arial,sans-serif;margin:20px;color:#111;font-size:11px}h1{text-align:center;font-size:15px;margin-bottom:4px}.sub{text-align:center;font-size:10px;color:#555;margin-bottom:14px}table{width:100%;border-collapse:collapse}th{background:#7c3aed;color:#fff;padding:5px 6px;text-align:left;font-size:10px}td{padding:4px 6px;border-bottom:1px solid #e5e7eb;font-size:10px}tr:nth-child(even) td{background:#f9fafb}.si{color:#dc2626;font-weight:bold}.vencida{color:#dc2626;font-weight:bold}@media print{body{margin:0}}</style>
  </head><body>
  <h1>FGL-010 — Inventario de Sustancias Químicas</h1>
  <p class="sub">Generado: ${new Date().toLocaleString('es-CO')} | Total: ${data.length}</p>
  <table><thead><tr><th>Producto</th><th>CAS</th><th>Laboratorio</th><th>Cantidad</th><th>Vencimiento</th><th>Peligrosidad</th><th>Controlada</th><th>Cancerígena</th><th>Registrado Por</th><th>Fecha Registro</th></tr></thead>
  <tbody>${data.map(s => {
    const vencida = s.fecha_vencimiento && new Date(s.fecha_vencimiento) <= new Date()
    return `<tr><td><b>${s.nombre_producto}</b>${s.ubicacion ? `<br><small>${s.ubicacion}</small>` : ''}</td><td>${s.cas ?? '—'}</td><td>${s.laboratorio}</td><td>${s.cantidad_actual != null ? `${s.cantidad_actual} ${s.unidad ?? ''}` : '—'}</td><td class="${vencida ? 'vencida' : ''}">${s.fecha_vencimiento ? fmt(s.fecha_vencimiento) : '—'}</td><td>${s.peligrosidad ?? '—'}</td><td class="${s.sustancia_controlada ? 'si' : ''}">${s.sustancia_controlada ? 'Sí' : 'No'}</td><td class="${s.sustancia_cancerigena ? 'si' : ''}">${s.sustancia_cancerigena ? 'Sí' : 'No'}</td><td>${s.registrado_por ?? '—'}</td><td>${fmtDT(s.created_at)}</td></tr>`
  }).join('')}</tbody></table>
  <script>window.onload=()=>window.print()</script></body></html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'width=1000,height=700')
  setTimeout(() => URL.revokeObjectURL(url), 15000)
}

export default function FGL010Page() {
  const supabase = createClient()
  const [sustancias, setSustancias] = useState<Sustancia[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<'todas' | 'controlada' | 'cancerigena' | 'vencidas'>('todas')
  const [userEmail, setUserEmail] = useState('')

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editRecord, setEditRecord] = useState<Sustancia | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ nombre_producto: '', cas: '', cantidad_actual: '', unidad: '', ubicacion: '', fecha_vencimiento: '', peligrosidad: '', sustancia_controlada: false, sustancia_cancerigena: false, observaciones: '', registrado_por: '' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [addLab, setAddLab] = useState('')
  const [addLabCustom, setAddLabCustom] = useState('')
  const [labs, setLabs] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [dlDateFrom, setDlDateFrom] = useState('')
  const [dlDateTo, setDlDateTo] = useState('')
  const [showDlPanel, setShowDlPanel] = useState(false)

  const fetchSustancias = async () => {
    setLoading(true)
    let query = supabase.from('fgl_010').select('*').order('nombre_producto')
    if (filtro === 'controlada') query = query.eq('sustancia_controlada', true)
    if (filtro === 'cancerigena') query = query.eq('sustancia_cancerigena', true)
    if (filtro === 'vencidas') query = query.lte('fecha_vencimiento', today).not('fecha_vencimiento', 'is', null)
    if (ORG_ID) query = query.eq('organizacion_id', ORG_ID)
    const { data } = await query
    setSustancias(data ?? [])
    setLoading(false)
  }

  const fetchLabs = async () => {
    let query = supabase.from('qr_codes').select('laboratorio').order('laboratorio')
    if (ORG_ID) query = query.eq('organizacion_id', ORG_ID)
    const { data } = await query
    if (data) setLabs([...new Set(data.map((d: { laboratorio: string }) => d.laboratorio))])
  }

  useEffect(() => { fetchSustancias() }, [filtro])
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

  const filtered = sustancias.filter(s =>
    s.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
    (s.cas ?? '').includes(search) ||
    s.laboratorio.toLowerCase().includes(search.toLowerCase())
  )

  const openEdit = (s: Sustancia) => {
    setEditRecord(s)
    setEditForm({
      nombre_producto: s.nombre_producto, cas: s.cas ?? '', cantidad_actual: s.cantidad_actual != null ? String(s.cantidad_actual) : '',
      unidad: s.unidad ?? '', ubicacion: s.ubicacion ?? '', fecha_vencimiento: s.fecha_vencimiento ?? '',
      peligrosidad: s.peligrosidad ?? '', sustancia_controlada: s.sustancia_controlada,
      sustancia_cancerigena: s.sustancia_cancerigena, observaciones: s.observaciones ?? '',
      registrado_por: s.registrado_por ?? '',
    })
  }

  const handleEdit = async () => {
    if (!editRecord) return
    setSaving(true)
    await supabase.from('fgl_010').update({
      nombre_producto: editForm.nombre_producto, cas: editForm.cas || null,
      cantidad_actual: editForm.cantidad_actual ? parseFloat(editForm.cantidad_actual) : null,
      unidad: editForm.unidad || null, ubicacion: editForm.ubicacion || null,
      fecha_vencimiento: editForm.fecha_vencimiento || null, peligrosidad: editForm.peligrosidad || null,
      sustancia_controlada: editForm.sustancia_controlada, sustancia_cancerigena: editForm.sustancia_cancerigena,
      observaciones: editForm.observaciones || null, registrado_por: editForm.registrado_por || null,
    }).eq('id', editRecord.id)
    await logAudit(supabase, { tabla: 'fgl_010', registro_id: editRecord.id, accion: 'editar', descripcion: `Edición de "${editForm.nombre_producto}"`, usuario: userEmail, laboratorio: editRecord.laboratorio })
    setEditRecord(null)
    setSaving(false)
    fetchSustancias()
  }

  const handleDelete = async (id: string) => {
    const record = sustancias.find(s => s.id === id)
    await supabase.from('fgl_010').delete().eq('id', id)
    await logAudit(supabase, { tabla: 'fgl_010', registro_id: id, accion: 'eliminar', descripcion: `Eliminación de "${record?.nombre_producto}"`, usuario: userEmail, laboratorio: record?.laboratorio })
    setDeleteId(null)
    fetchSustancias()
  }

  const labSeleccionado = addLab === '__custom' ? addLabCustom : addLab
  const setEF = (k: keyof EditForm, v: string | boolean) => setEditForm(f => ({ ...f, [k]: v }))

  const dataParaDescarga = sustancias.filter(s => {
    const cr = s.created_at?.split('T')[0] ?? ''
    return (!dlDateFrom || cr >= dlDateFrom) && (!dlDateTo || cr <= dlDateTo)
  })

  return (
    <div>
      {/* Modal eliminar */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <div className="text-4xl text-center mb-3">🗑️</div>
            <h3 className="font-bold text-gray-900 text-lg text-center mb-2">Eliminar sustancia</h3>
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
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Editar Sustancia</h3>
              <button onClick={() => setEditRecord(null)} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del producto *</label>
                <input value={editForm.nombre_producto} onChange={e => setEF('nombre_producto', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CAS</label>
                  <input value={editForm.cas} onChange={e => setEF('cas', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ubicación</label>
                  <input value={editForm.ubicacion} onChange={e => setEF('ubicacion', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
                  <input type="number" step="0.01" value={editForm.cantidad_actual} onChange={e => setEF('cantidad_actual', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unidad</label>
                  <input value={editForm.unidad} onChange={e => setEF('unidad', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha vencimiento</label>
                  <input type="date" value={editForm.fecha_vencimiento} onChange={e => setEF('fecha_vencimiento', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Peligrosidad</label>
                  <input value={editForm.peligrosidad} onChange={e => setEF('peligrosidad', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                  <input type="checkbox" checked={editForm.sustancia_controlada} onChange={e => setEF('sustancia_controlada', e.target.checked)} className="w-4 h-4" />
                  Controlada
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                  <input type="checkbox" checked={editForm.sustancia_cancerigena} onChange={e => setEF('sustancia_cancerigena', e.target.checked)} className="w-4 h-4" />
                  Cancerígena
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Registrado por</label>
                <input value={editForm.registrado_por} onChange={e => setEF('registrado_por', e.target.value)}
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
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-2 rounded-lg text-sm">
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
              <h3 className="font-bold text-gray-900">Nuevo Registro Manual — FGL-010</h3>
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
                <FormFGL010 qrCodigo="ADMIN-MANUAL" laboratorio={labSeleccionado}
                  onSuccess={async () => {
                    await logAudit(supabase, { tabla: 'fgl_010', accion: 'crear', descripcion: `Registro manual en ${labSeleccionado}`, usuario: userEmail, laboratorio: labSeleccionado })
                    setShowAddModal(false); setAddLab(''); setAddLabCustom(''); fetchSustancias()
                  }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FGL 010 — Inventario de Sustancias Químicas</h1>
          <p className="text-gray-600 text-sm mt-1">Control de inventario, vencimientos y clasificación de peligrosidad</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Nuevo Registro
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, CAS, laboratorio..."
          className="flex-1 min-w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex flex-wrap gap-2">
          {[{ key: 'todas', label: 'Todas' }, { key: 'controlada', label: 'Controladas' }, { key: 'cancerigena', label: 'Cancerígenas' }, { key: 'vencidas', label: 'Vencidas' }].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key as typeof filtro)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filtro === f.key ? 'bg-purple-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Producto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">CAS</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Laboratorio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cantidad</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vencimiento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Clasificación</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Registrado Por</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha Registro</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-500">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-500">Sin registros</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className={`hover:bg-gray-50 ${isVencida(s.fecha_vencimiento) ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{s.nombre_producto}</p>
                  {s.ubicacion && <p className="text-xs text-gray-500">{s.ubicacion}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.cas ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">{s.laboratorio}</td>
                <td className="px-4 py-3 text-gray-700">{s.cantidad_actual != null ? `${s.cantidad_actual} ${s.unidad ?? ''}` : '—'}</td>
                <td className="px-4 py-3">
                  {s.fecha_vencimiento ? (
                    <span className={`text-xs font-semibold ${isVencida(s.fecha_vencimiento) ? 'text-red-600' : isProxima(s.fecha_vencimiento) ? 'text-yellow-600' : 'text-gray-700'}`}>
                      {isVencida(s.fecha_vencimiento) ? '⚠️ ' : isProxima(s.fecha_vencimiento) ? '⏰ ' : ''}
                      {fmt(s.fecha_vencimiento)}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.sustancia_controlada && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Controlada</span>}
                    {s.sustancia_cancerigena && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Cancerígena</span>}
                    {!s.sustancia_controlada && !s.sustancia_cancerigena && <span className="text-xs text-gray-400">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{s.registrado_por ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDT(s.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors">Editar</button>
                    <button onClick={() => setDeleteId(s.id)} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors">Eliminar</button>
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
            <button onClick={() => downloadCSV(dataParaDescarga, `FGL-010_${new Date().toISOString().split('T')[0]}.csv`)} className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">CSV</button>
            <button onClick={() => downloadExcelFGL010(dataParaDescarga, `FGL-010_${new Date().toISOString().split('T')[0]}.xlsx`)} className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Excel (Formato oficial)</button>
            <button onClick={() => imprimirFormato(dataParaDescarga)} className="bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Imprimir / PDF</button>
          </div>
        )}
      </div>
    </div>
  )
}
