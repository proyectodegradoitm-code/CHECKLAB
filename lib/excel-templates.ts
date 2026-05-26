import * as XLSX from 'xlsx'

// ── helpers ──────────────────────────────────────────────────────────────────

async function loadTemplate(publicPath: string): Promise<XLSX.WorkBook> {
  const res = await fetch(publicPath)
  if (!res.ok) throw new Error(`No se pudo cargar la plantilla: ${publicPath}`)
  const buffer = await res.arrayBuffer()
  return XLSX.read(buffer, { type: 'array', cellStyles: true })
}

function triggerDownload(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function setCell(ws: XLSX.WorkSheet, row: number, col: number, value: string | number | null) {
  if (value === null || value === undefined || value === '') return
  const addr = XLSX.utils.encode_cell({ r: row, c: col })
  ws[addr] = { v: value, t: typeof value === 'number' ? 'n' : 's' }
}

function extendRange(ws: XLSX.WorkSheet, lastRow: number, lastCol: number) {
  const existing = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:A1')
  ws['!ref'] = XLSX.utils.encode_range({
    s: existing.s,
    e: { r: Math.max(existing.e.r, lastRow), c: Math.max(existing.e.c, lastCol) },
  })
}

const fmt = (d: string | null) =>
  d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }) : ''

const fmtDT = (d: string) =>
  new Date(d).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

// ── FGL 004 ───────────────────────────────────────────────────────────────────

type Prestamo = {
  id: string
  nombre: string
  carnet_cc: string
  laboratorio: string
  elemento: string
  cantidad: number
  fecha_entrega: string
  fecha_devolucion: string | null
  estado: string
  observaciones: string | null
  created_at: string
}

export async function downloadExcelFGL004(data: Prestamo[], filename: string) {
  const wb = await loadTemplate('/templates/FGL-004-template.xlsx')

  // Add a tabular sheet with all records
  const headers = [
    'N°', 'Nombre / Solicitante', 'Carné / CC', 'Laboratorio',
    'Elemento / Equipo / EPP', 'Cantidad', 'Fecha Entrega',
    'Fecha Devolución', 'Estado', 'Observaciones', 'Fecha Registro',
  ]
  const rows = data.map((p, i) => [
    i + 1, p.nombre, p.carnet_cc, p.laboratorio, p.elemento, p.cantidad,
    fmt(p.fecha_entrega), p.fecha_devolucion ? fmt(p.fecha_devolucion) : '',
    p.estado === 'activo' ? 'Activo' : 'Devuelto',
    p.observaciones ?? '', fmtDT(p.created_at),
  ])

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...rows])
  wsData['!cols'] = [
    { wch: 5 }, { wch: 28 }, { wch: 14 }, { wch: 28 },
    { wch: 30 }, { wch: 8 }, { wch: 14 }, { wch: 16 },
    { wch: 10 }, { wch: 35 }, { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(wb, wsData, 'Registros CHECKLAB')

  // Move the new sheet to be the first
  const idx = wb.SheetNames.indexOf('Registros CHECKLAB')
  wb.SheetNames.splice(idx, 1)
  wb.SheetNames.unshift('Registros CHECKLAB')

  triggerDownload(wb, filename)
}

// ── FGL 010 ───────────────────────────────────────────────────────────────────

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
  registrado_por?: string | null
  created_at: string
}

export async function downloadExcelFGL010(data: Sustancia[], filename: string) {
  const wb = await loadTemplate('/templates/FGL-010-template.xlsm')

  const ws = wb.Sheets['Inventario SQ']
  if (ws) {
    // Data rows start at index 7 (row 8 in Excel — after the 2-row header at row 7)
    const DATA_START = 7
    data.forEach((s, i) => {
      const r = DATA_START + i
      setCell(ws, r, 0, i + 1)                                        // N°
      setCell(ws, r, 1, s.nombre_producto)                            // Nombre producto
      setCell(ws, r, 3, s.ubicacion ?? '')                            // Ubicación
      setCell(ws, r, 9, s.cas ?? '')                                  // N° CAS
      setCell(ws, r, 11, s.laboratorio)                               // Laboratorio
      setCell(ws, r, 12, s.fecha_vencimiento ?? '')                   // Fecha vencimiento
      setCell(ws, r, 13, s.cantidad_actual != null                    // Cantidad
        ? `${s.cantidad_actual}${s.unidad ? ' ' + s.unidad : ''}` : '')
      setCell(ws, r, 22, s.sustancia_controlada ? 'Si' : 'No')       // Controlada
      setCell(ws, r, 23, s.peligrosidad ?? '')                        // Peligrosidad (aprox)
      setCell(ws, r, 36, s.observaciones ?? '')                       // Observaciones
      setCell(ws, r, 37, s.registrado_por ?? '')                      // Revisado/registrado por
      setCell(ws, r, 38, s.estado_vigencia ?? '')                     // Estado vigencia
    })
    if (data.length > 0) extendRange(ws, DATA_START + data.length - 1, 40)
  }

  triggerDownload(wb, filename)
}

// ── FGL 140 ───────────────────────────────────────────────────────────────────

type ControlEpp = {
  id: string
  laboratorio: string
  elemento_tipo: string
  identificacion: string | null
  fecha_revision: string
  fecha_vencimiento: string | null
  estado: string
  periodicidad: string | null
  revisado_por: string | null
  observaciones: string | null
  created_at: string
}

const ELEMENTO_LABELS: Record<string, string> = {
  ducha: 'Ducha de emergencia y Lavaojos',
  extintor: 'Extintor',
  botiquin: 'Botiquín de primeros auxilios',
  kit_derrames: 'Kit derrames (ácidos/bases)',
  kit_hidrocarburos: 'Kit derrames hidrocarburos',
  kit_mercurio: 'Kit derrames mercurio',
}

const PERIODICIDAD_LABELS: Record<string, string> = {
  '15_dias': '15 días', '1_mes': '1 mes', '2_meses': '2 meses', anual: 'Anual',
}

// Fills a simple tabular area in a sheet starting at dataStartRow
// Columns: fecha_revision | identificacion | estado | periodicidad | fecha_vencimiento | observaciones+revisado_por
function fillEppSheet(
  ws: XLSX.WorkSheet,
  records: ControlEpp[],
  dataStartRow: number,
  colMap: {
    fecha: number
    id: number
    estado_bueno: number
    estado_malo: number
    fecVenc: number
    obs: number
  }
) {
  records.forEach((r, i) => {
    const row = dataStartRow + i
    setCell(ws, row, colMap.fecha, r.fecha_revision)
    setCell(ws, row, colMap.id, r.identificacion ?? '')
    if (r.estado === 'bueno') setCell(ws, row, colMap.estado_bueno, 'X')
    if (r.estado === 'malo') setCell(ws, row, colMap.estado_malo, 'X')
    setCell(ws, row, colMap.fecVenc, r.fecha_vencimiento ?? '')
    const obs = [r.observaciones, r.revisado_por ? `Rev: ${r.revisado_por}` : null]
      .filter(Boolean).join(' | ')
    setCell(ws, row, colMap.obs, obs)
    extendRange(ws, row, colMap.obs)
  })
}

export async function downloadExcelFGL140(data: ControlEpp[], filename: string) {
  const wb = await loadTemplate('/templates/FGL-140-template.xlsm')

  const DATA_START = 11 // Row 12 in Excel (0-indexed 11), after header+format rows

  // Map each tipo to its sheet and column mapping
  type ColMap = { fecha: number; id: number; estado_bueno: number; estado_malo: number; fecVenc: number; obs: number }

  const sheetConfig: Record<string, { sheet: string; cols: ColMap }> = {
    extintor: {
      sheet: 'Extintores',
      cols: { fecha: 0, id: 3, estado_bueno: 4, estado_malo: 6, fecVenc: 28, obs: 31 },
    },
    ducha: {
      sheet: 'Ducha',
      cols: { fecha: 0, id: 3, estado_bueno: 4, estado_malo: 6, fecVenc: 28, obs: 24 },
    },
    botiquin: {
      sheet: 'Botiquín',
      cols: { fecha: 0, id: 12, estado_bueno: 17, estado_malo: 18, fecVenc: 13, obs: 21 },
    },
    kit_derrames: {
      sheet: 'Kit derrames',
      cols: { fecha: 0, id: 3, estado_bueno: 6, estado_malo: 8, fecVenc: 28, obs: 26 },
    },
    kit_hidrocarburos: {
      sheet: 'Kit derrames hidrocarburos',
      cols: { fecha: 0, id: 3, estado_bueno: 7, estado_malo: 9, fecVenc: 28, obs: 27 },
    },
    kit_mercurio: {
      sheet: 'Kit derrames mercurio',
      cols: { fecha: 0, id: 3, estado_bueno: 3, estado_malo: 5, fecVenc: 28, obs: 23 },
    },
  }

  // Group by tipo
  const byTipo: Record<string, ControlEpp[]> = {}
  data.forEach(r => {
    const tipo = r.elemento_tipo
    if (!byTipo[tipo]) byTipo[tipo] = []
    byTipo[tipo].push(r)
  })

  // Fill each element-specific sheet
  Object.entries(byTipo).forEach(([tipo, records]) => {
    const cfg = sheetConfig[tipo]
    if (!cfg) return
    const ws = wb.Sheets[cfg.sheet]
    if (!ws) return
    fillEppSheet(ws, records, DATA_START, cfg.cols)
  })

  // Add master "Registros" sheet with all data
  const headers = [
    'N°', 'Elemento', 'Laboratorio', 'ID / Placa',
    'Fecha Revisión', 'Fecha Vencimiento', 'Estado',
    'Periodicidad', 'Revisado Por', 'Observaciones', 'Fecha Registro',
  ]
  const rows = data.map((r, i) => [
    i + 1,
    ELEMENTO_LABELS[r.elemento_tipo] ?? r.elemento_tipo,
    r.laboratorio,
    r.identificacion ?? '',
    fmt(r.fecha_revision),
    r.fecha_vencimiento ? fmt(r.fecha_vencimiento) : '',
    r.estado,
    PERIODICIDAD_LABELS[r.periodicidad ?? ''] ?? (r.periodicidad ?? ''),
    r.revisado_por ?? '',
    r.observaciones ?? '',
    fmtDT(r.created_at),
  ])

  const wsAll = XLSX.utils.aoa_to_sheet([headers, ...rows])
  wsAll['!cols'] = [
    { wch: 5 }, { wch: 28 }, { wch: 28 }, { wch: 14 },
    { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 12 },
    { wch: 20 }, { wch: 35 }, { wch: 18 },
  ]

  // Insert "Registros CHECKLAB" as the first sheet
  XLSX.utils.book_append_sheet(wb, wsAll, 'Registros CHECKLAB')
  const idx = wb.SheetNames.indexOf('Registros CHECKLAB')
  wb.SheetNames.splice(idx, 1)
  wb.SheetNames.unshift('Registros CHECKLAB')

  triggerDownload(wb, filename)
}
