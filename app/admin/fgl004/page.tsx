'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import FormFGL004 from '@/components/forms/FormFGL004'
import { downloadExcelFGL004 } from '@/lib/excel-templates'
import { ORG_ID } from '@/lib/org'

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
  created_at: string
}

type EditForm = {
  nombre: string
  carnet_cc: string
  elemento: string
  cantidad: number
  observaciones: string
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtDT = (d: string) =>
  new Date(d).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function downloadCSV(data: Prestamo[], filename: string) {
  const headers = ['Nombre', 'Carnet/CC', 'Laboratorio', 'Elemento', 'Cantidad', 'F. Entrega', 'F. Devolución', 'Estado', 'Observaciones', 'Fecha Registro']
  const rows = data.map(p => [
    p.nombre, p.carnet_cc, p.laboratorio, p.elemento, String(p.cantidad),
    fmt(p.fecha_entrega), p.fecha_devolucion ? fmt(p.fecha_devolucion) : '',
    p.estado === 'activo' ? 'Activo' : 'Devuelto',
    p.observaciones ?? '', fmtDT(p.created_at),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}


function imprimirFormato(data: Prestamo[]) {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>FGL-004</title>
  <style>
    body{font-family:Arial,sans-serif;margin:20px;color:#111;font-size:12px}
    h1{text-align:center;font-size:16px;margin-bottom:4px}
    .sub{text-align:center;font-size:11px;color:#555;margin-bottom:16px}
    table{width:100%;border-collapse:collapse}
    th{background:#1e40af;color:#fff;padding:6px 8px;text-align:left;font-size:11px}
    td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:11px}
    tr:nth-child(even) td{background:#f9fafb}
    .activo{background:#fed7aa;color:#9a3412;padding:2px 6px;border-radius:9999px;font-size:10px;font-weight:bold}
    .devuelto{background:#bbf7d0;color:#14532d;padding:2px 6px;border-radius:9999px;font-size:10px;font-weight:bold}
    @media print{body{margin:0}}
  </style></head><body>
  <h1>FGL-004 — Registro de Préstamo de Equipos, Herramientas y EPP</h1>
  <p class="sub">Generado: ${new Date().toLocaleString('es-CO')} | Total: ${data.length}</p>
  <table><thead><tr><th>Solicitante</th><th>Carnet/CC</th><th>Laboratorio</th><th>Elemento</th><th>Cant.</th><th>F.Entrega</th><th>F.Devolución</th><th>Estado</th><th>Observaciones</th><th>Fecha Registro</th></tr></thead>
  <tbody>${data.map(p => `<tr><td>${p.nombre}</td><td>${p.carnet_cc}</td><td>${p.laboratorio}</td><td>${p.elemento}</td><td>${p.cantidad}</td><td>${fmt(p.fecha_entrega)}</td><td>${p.fecha_devolucion ? fmt(p.fecha_devolucion) : '—'}</td><td><span class="${p.estado}">${p.estado === 'activo' ? 'Activo' : 'Devuelto'}</span></td><td>${p.observaciones ?? '—'}</td><td>${fmtDT(p.created_at)}</td></tr>`).join('')}</tbody>
  </table><script>window.onload=()=>window.print()</script></body></html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'width=900,height=700')
  setTimeout(() => URL.revokeObjectURL(url), 15000)
}

export default function FGL004Page() {
  const supabase = createClient()
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'activo' | 'devuelto'>('todos')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // Modales
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editRecord, setEditRecord] = useState<Prestamo | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ nombre: '', carnet_cc: '', elemento: '', cantidad: 1, observaciones: '' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [addLab, setAddLab] = useState('')
  const [addLabCustom, setAddLabCustom] = useState('')
  const [labs, setLabs] = useState<string[]>([])

  // Descarga
  const [dlDateFrom, setDlDateFrom] = useState('')
  const [dlDateTo, setDlDateTo] = useState('')
  const [showDlPanel, setShowDlPanel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 100

  const fetchPrestamos = async (currentPage = page) => {
    setLoading(true)
    let query = supabase.from('fgl_004').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (filtro !== 'todos') query = query.eq('estado', filtro)
    if (ORG_ID) query = query.eq('organizacion_id', ORG_ID)
    query = query.range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)
    const { data, count } = await query
    setPrestamos(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  const fetchLabs = async () => {
    let query = supabase.from('qr_codes').select('laboratorio').order('laboratorio')
    if (ORG_ID) query = query.eq('organizacion_id', ORG_ID)
    const { data } = await query
    if (data) setLabs([...new Set(data.map((d: { laboratorio: string }) => d.laboratorio))])
  }

  useEffect(() => { setPage(0); fetchPrestamos(0) }, [filtro])
  useEffect(() => {
    fetchLabs()
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ''))
  }, [])

  const handleDevolucionConfirm = async (id: string) => {
    const record = prestamos.find(p => p.id === id)
    await supabase.from('fgl_004').update({ estado: 'devuelto', fecha_devolucion: new Date().toISOString() }).eq('id', id)
    await logAudit(supabase, { tabla: 'fgl_004', registro_id: id, accion: 'devolucion', descripcion: `Devolución de "${record?.elemento}" por ${record?.nombre}`, usuario: userEmail, laboratorio: record?.laboratorio })
    fetchPrestamos()
  }

  const openEdit = (p: Prestamo) => {
    setEditRecord(p)
    setEditForm({ nombre: p.nombre, carnet_cc: p.carnet_cc, elemento: p.elemento, cantidad: p.cantidad, observaciones: p.observaciones ?? '' })
  }

  const handleEdit = async () => {
    if (!editRecord) return
    if (!editForm.nombre.trim() || !editForm.elemento.trim()) { setEditError('Nombre y elemento son obligatorios.'); return }
    setSaving(true)
    setEditError('')
    const { error: updateErr } = await supabase.from('fgl_004').update({
      nombre: editForm.nombre,
      carnet_cc: editForm.carnet_cc,
      elemento: editForm.elemento,
      cantidad: editForm.cantidad,
      observaciones: editForm.observaciones || null,
    }).eq('id', editRecord.id)
    if (updateErr) { setEditError(`Error al guardar: ${updateErr.message}`); setSaving(false); return }
    await logAudit(supabase, {
      tabla: 'fgl_004', registro_id: editRecord.id, accion: 'editar',
      descripcion: `Edición de "${editForm.elemento}" por ${editForm.nombre}`, usuario: userEmail, laboratorio: editRecord.laboratorio,
      datos: {
        antes: { nombre: editRecord.nombre, carnet_cc: editRecord.carnet_cc, elemento: editRecord.elemento, cantidad: editRecord.cantidad },
        despues: { nombre: editForm.nombre, carnet_cc: editForm.carnet_cc, elemento: editForm.elemento, cantidad: editForm.cantidad },
      },
    })
    setEditRecord(null)
    setSaving(false)
    fetchPrestamos()
  }

  const handleDelete = async (id: string) => {
    const record = prestamos.find(p => p.id === id)
    await supabase.from('fgl_004').delete().eq('id', id)
    await logAudit(supabase, { tabla: 'fgl_004', registro_id: id, accion: 'eliminar', descripcion: `Eliminación de "${record?.elemento}" por ${record?.nombre}`, usuario: userEmail, laboratorio: record?.laboratorio })
    setDeleteId(null)
    fetchPrestamos()
  }

  const labSeleccionado = addLab === '__custom' ? addLabCustom : addLab

  const filtered = prestamos.filter(p => {
    const matchSearch =
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.carnet_cc.includes(search) ||
      p.elemento.toLowerCase().includes(search.toLowerCase()) ||
      p.laboratorio.toLowerCase().includes(search.toLowerCase())
    const fechaEntrega = p.fecha_entrega?.split('T')[0] ?? ''
    return matchSearch && (!dateFrom || fechaEntrega >= dateFrom) && (!dateTo || fechaEntrega <= dateTo)
  })

  const dataParaDescarga = prestamos.filter(p => {
    const cr = p.created_at?.split('T')[0] ?? ''
    return (!dlDateFrom || cr >= dlDateFrom) && (!dlDateTo || cr <= dlDateTo)
  })

  const setEF = (k: keyof EditForm, v: string | number) => setEditForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      {/* Modal confirmación devolución */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <div className="text-4xl text-center mb-3">↩️</div>
            <h3 className="font-bold text-gray-900 text-lg text-center mb-2">Confirmar devolución</h3>
            <p className="text-gray-600 text-sm text-center mb-6">¿Está seguro de registrar la devolución? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => { handleDevolucionConfirm(confirmId); setConfirmId(null) }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg text-sm">Confirmar devolución</button>
              <button onClick={() => setConfirmId(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminar */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <div className="text-4xl text-center mb-3">🗑️</div>
            <h3 className="font-bold text-gray-900 text-lg text-center mb-2">Eliminar registro</h3>
            <p className="text-gray-600 text-sm text-center mb-6">Esta acción es permanente y no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg text-sm">Eliminar</button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Editar Registro</h3>
              <button onClick={() => setEditRecord(null)} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {[
                { label: 'Nombre completo', key: 'nombre' as const, placeholder: 'Nombre del solicitante' },
                { label: 'Carné / CC', key: 'carnet_cc' as const, placeholder: 'Número de documento' },
                { label: 'Elemento / Equipo', key: 'elemento' as const, placeholder: 'Nombre del equipo' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                  <input value={editForm[f.key] as string} onChange={e => setEF(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
                <input type="number" min={1} value={editForm.cantidad} onChange={e => setEF('cantidad', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={editForm.observaciones} onChange={e => setEF('observaciones', e.target.value)}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            {editError && <p className="px-6 pb-2 text-red-600 text-xs">{editError}</p>}
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={handleEdit} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 rounded-lg text-sm">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button onClick={() => { setEditRecord(null); setEditError('') }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal entrada manual */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Nuevo Registro Manual — FGL-004</h3>
              <button onClick={() => { setShowAddModal(false); setAddLab(''); setAddLabCustom('') }}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
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
                  <input value={addLabCustom} onChange={e => setAddLabCustom(e.target.value)}
                    placeholder="Nombre del laboratorio"
                    className="mt-2 w-full border border-blue-400 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                )}
              </div>
              {labSeleccionado && (
                <FormFGL004 qrCodigo="ADMIN-MANUAL" laboratorio={labSeleccionado}
                  onSuccess={async () => {
                    await logAudit(supabase, { tabla: 'fgl_004', accion: 'crear', descripcion: `Registro manual en ${labSeleccionado}`, usuario: userEmail, laboratorio: labSeleccionado })
                    setShowAddModal(false); setAddLab(''); setAddLabCustom(''); fetchPrestamos()
                  }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shrink-0">🔑</div>
          <div>
            <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">FGL 004 — Préstamo de Equipos</h1>
            <p className="text-gray-500 text-sm mt-0.5">Registro de préstamos y devoluciones de equipos, herramientas y EPP</p>
          </div>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shrink-0">
          + Nuevo Registro
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, documento, elemento..."
          className="flex-1 min-w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-2">
          {(['todos', 'activo', 'devuelto'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filtro === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              {f === 'todos' ? 'Todos' : f === 'activo' ? 'Activos' : 'Devueltos'}
            </button>
          ))}
        </div>
      </div>

      {/* Rango fechas entrega */}
      <div className="flex flex-wrap items-center gap-3 mb-5 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <span className="text-xs font-semibold text-gray-600 uppercase">Rango F. Entrega:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-gray-400 text-sm">—</span>
        <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-blue-600 hover:underline">Limpiar</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Solicitante</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Elemento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Laboratorio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">F. Entrega</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">F. Devolución</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha Registro</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">Sin registros</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{p.nombre}</p>
                  <p className="text-xs text-gray-500">{p.carnet_cc}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-900">{p.elemento}</p>
                  <p className="text-xs text-gray-500">Cant: {p.cantidad}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{p.laboratorio}</td>
                <td className="px-4 py-3 text-gray-700">{fmt(p.fecha_entrega)}</td>
                <td className="px-4 py-3">
                  {p.fecha_devolucion
                    ? <span className="text-gray-700">{fmt(p.fecha_devolucion)}</span>
                    : <span className="text-orange-600 font-medium">Pendiente</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${p.estado === 'activo' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {p.estado === 'activo' ? 'Activo' : 'Devuelto'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDT(p.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 flex-wrap">
                    {p.estado === 'activo' && (
                      <button onClick={() => setConfirmId(p.id)}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors">
                        Devolver
                      </button>
                    )}
                    <button onClick={() => openEdit(p)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors">
                      Editar
                    </button>
                    <button onClick={() => setDeleteId(p.id)}
                      className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-xs text-gray-500">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total} registros
          </span>
          <div className="flex gap-2">
            <button onClick={() => { setPage(p => p - 1); fetchPrestamos(page - 1) }} disabled={page === 0}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-50">
              ← Anterior
            </button>
            <button onClick={() => { setPage(p => p + 1); fetchPrestamos(page + 1) }} disabled={(page + 1) * PAGE_SIZE >= total}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-50">
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Descarga */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <button onClick={() => setShowDlPanel(!showDlPanel)}
          className="text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2">
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
            <button onClick={() => downloadCSV(dataParaDescarga, `FGL-004_${new Date().toISOString().split('T')[0]}.csv`)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              CSV
            </button>
            <button onClick={() => downloadExcelFGL004(dataParaDescarga, `FGL-004_${new Date().toISOString().split('T')[0]}.xlsx`)}
              className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Excel (Formato oficial)
            </button>
            <button onClick={() => imprimirFormato(dataParaDescarga)}
              className="bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Imprimir / PDF
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
