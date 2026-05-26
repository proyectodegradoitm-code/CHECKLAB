# -*- coding: utf-8 -*-
"""
Genera el Manual de Uso de CHECKLAB en PDF con el logo ITM.
Salida: public/CHECKLAB_Manual_de_Uso.pdf
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image, PageBreak, KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfgen import canvas as pdfcanvas
import os

OUTPUT = "public/CHECKLAB_Manual_de_Uso.pdf"
LOGO   = "public/logoitm.png"

# ── Paleta de colores ITM ──────────────────────────────────────────────────────
ITM_BLUE   = colors.HexColor("#1a3a6e")
ITM_BLUE2  = colors.HexColor("#2563eb")
ITM_GRAY   = colors.HexColor("#6b7280")
ITM_LIGHT  = colors.HexColor("#eff6ff")
ITM_RED    = colors.HexColor("#dc2626")
ITM_GREEN  = colors.HexColor("#16a34a")
ITM_AMBER  = colors.HexColor("#d97706")
ROW_ALT    = colors.HexColor("#f8fafc")
WHITE      = colors.white
BLACK      = colors.HexColor("#111827")

W, H = A4

# ── Estilos ────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, **kw)

styles = {
    "cover_title":  S("ct",  fontSize=26, fontName="Helvetica-Bold",
                       textColor=ITM_BLUE,  alignment=TA_CENTER, spaceAfter=6),
    "cover_sub":    S("cs",  fontSize=13, fontName="Helvetica",
                       textColor=ITM_BLUE2, alignment=TA_CENTER, spaceAfter=4),
    "cover_small":  S("csm", fontSize=10, fontName="Helvetica",
                       textColor=ITM_GRAY,  alignment=TA_CENTER, spaceAfter=2),
    "h1":           S("h1",  fontSize=14, fontName="Helvetica-Bold",
                       textColor=WHITE,     spaceBefore=14, spaceAfter=6,
                       leftIndent=0, borderPad=6),
    "h2":           S("h2",  fontSize=11, fontName="Helvetica-Bold",
                       textColor=ITM_BLUE,  spaceBefore=10, spaceAfter=4),
    "h3":           S("h3",  fontSize=10, fontName="Helvetica-Bold",
                       textColor=BLACK,     spaceBefore=6,  spaceAfter=3),
    "body":         S("bd",  fontSize=9,  fontName="Helvetica",
                       textColor=BLACK,     leading=14,     spaceAfter=4,
                       alignment=TA_JUSTIFY),
    "note":         S("nt",  fontSize=8.5, fontName="Helvetica-Oblique",
                       textColor=ITM_GRAY,  leading=13,     spaceAfter=4,
                       leftIndent=10, borderPad=4),
    "bullet":       S("bl",  fontSize=9,  fontName="Helvetica",
                       textColor=BLACK,     leading=14,     spaceAfter=2,
                       leftIndent=14, bulletIndent=6),
    "code":         S("cd",  fontSize=8,  fontName="Courier",
                       textColor=ITM_BLUE,  leading=13,     spaceAfter=2,
                       leftIndent=12),
    "footer":       S("ft",  fontSize=7.5, fontName="Helvetica",
                       textColor=ITM_GRAY,  alignment=TA_CENTER),
}

# ── Utilidades ─────────────────────────────────────────────────────────────────
def h1_block(text, story):
    tbl = Table([[Paragraph(text, styles["h1"])]], colWidths=[W - 4*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), ITM_BLUE),
        ("ROUNDEDCORNERS", [6,6,6,6]),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 4))

def table(data, col_widths, story, header=True):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    cmds = [
        ("FONTNAME",    (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE",    (0,0), (-1,-1), 8.5),
        ("LEADING",     (0,0), (-1,-1), 12),
        ("ALIGN",       (0,0), (-1,-1), "LEFT"),
        ("VALIGN",      (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",  (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0),(-1,-1), 4),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("GRID",        (0,0), (-1,-1), 0.4, colors.HexColor("#e5e7eb")),
    ]
    if header:
        cmds += [
            ("BACKGROUND", (0,0), (-1,0), ITM_BLUE),
            ("FONTNAME",   (0,0), (-1,0), "Helvetica-Bold"),
            ("TEXTCOLOR",  (0,0), (-1,0), WHITE),
        ]
    # Alternate row colors
    for i in range(1 if header else 0, len(data)):
        if i % 2 == 0:
            cmds.append(("BACKGROUND", (0,i), (-1,i), ROW_ALT))
    t.setStyle(TableStyle(cmds))
    story.append(t)
    story.append(Spacer(1, 6))

def bp(text):
    return Paragraph(u"•  " + text, styles["bullet"])

def p(text):
    return Paragraph(text, styles["body"])

def note(text):
    tbl = Table([[Paragraph("<b>Nota:</b> " + text, styles["note"])]], colWidths=[W - 4*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), ITM_LIGHT),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LINEAFTER",     (0,0), (0,-1),  2, ITM_BLUE2),
    ]))
    return tbl

# ── Encabezado / pie de página ─────────────────────────────────────────────────
def on_page(cnv, doc):
    cnv.saveState()
    # Línea superior
    cnv.setStrokeColor(ITM_BLUE)
    cnv.setLineWidth(1.5)
    cnv.line(2*cm, H - 1.4*cm, W - 2*cm, H - 1.4*cm)
    # Logo pequeño arriba derecha
    if os.path.exists(LOGO):
        cnv.drawImage(LOGO, W - 4*cm, H - 1.8*cm, width=2.5*cm, height=1.2*cm,
                      preserveAspectRatio=True, mask="auto")
    # Texto arriba izquierda
    cnv.setFont("Helvetica", 7.5)
    cnv.setFillColor(ITM_GRAY)
    cnv.drawString(2*cm, H - 1.25*cm, "CHECKLAB — Manual de Uso")
    # Pie de página
    cnv.setStrokeColor(ITM_BLUE)
    cnv.setLineWidth(0.8)
    cnv.line(2*cm, 1.4*cm, W - 2*cm, 1.4*cm)
    cnv.setFont("Helvetica", 7.5)
    cnv.setFillColor(ITM_GRAY)
    cnv.drawString(2*cm, 1*cm,
        "Institución Universitaria ITM · Laboratorios de Docencia e Investigación")
    cnv.drawRightString(W - 2*cm, 1*cm, f"Página {doc.page}")
    cnv.restoreState()

# ── Contenido ──────────────────────────────────────────────────────────────────
def build_story():
    story = []

    # ── PORTADA ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 1.8*cm))
    if os.path.exists(LOGO):
        img = Image(LOGO, width=7*cm, height=3.4*cm)
        img.hAlign = "CENTER"
        story.append(img)
    story.append(Spacer(1, 0.8*cm))
    story.append(Paragraph("CHECKLAB", styles["cover_title"]))
    story.append(Paragraph("Manual de Uso e Instructivo", styles["cover_sub"]))
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="60%", thickness=2, color=ITM_BLUE2, hAlign="CENTER"))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("Sistema de Gestión Logística de Laboratorios", styles["cover_small"]))
    story.append(Paragraph("Laboratorios de Docencia e Investigación — ITM", styles["cover_small"]))
    story.append(Paragraph("Versión 1.0 · 2025", styles["cover_small"]))
    story.append(PageBreak())

    # ── 1. DESCRIPCIÓN GENERAL ─────────────────────────────────────────────────
    h1_block("1.  Descripción General", story)
    story.append(p(
        "CHECKLAB es un sistema web de gestión logística para los laboratorios del ITM. "
        "Permite registrar y controlar en tiempo real los préstamos de equipos, el inventario "
        "de sustancias químicas y las revisiones de elementos de protección, utilizando "
        "<b>códigos QR físicos</b> que los usuarios escanean directamente desde su celular."
    ))
    story.append(Spacer(1, 4))
    table(
        [
            ["Rol", "Acceso", "Función principal"],
            ["Usuario / Estudiante", "Escanea el QR con el celular",
             "Llena el formulario (sin cuenta requerida)"],
            ["Administrador / Laboratorista", "Correo y contraseña en /login",
             "Gestiona registros, genera QR y descarga reportes"],
        ],
        [4*cm, 5*cm, 7*cm], story,
    )
    story.append(Spacer(1, 4))

    # ── 2. ACCESO ──────────────────────────────────────────────────────────────
    h1_block("2.  Acceso al Sistema (Administrador)", story)
    story.append(p("URL de acceso: <b>http://[dirección-del-servidor]/login</b>"))
    story.append(Spacer(1, 3))
    for s in [
        "Ingresa el <b>correo electrónico</b> institucional registrado.",
        "Ingresa la <b>contraseña</b>.",
        'Haz clic en <b>"Ingresar al sistema"</b>.',
    ]:
        story.append(bp(s))
    story.append(Spacer(1, 4))
    story.append(note(
        "Si las credenciales son incorrectas aparecerá el mensaje "
        '"Credenciales incorrectas. Intenta de nuevo." '
        "Verifica mayúsculas y espacios."
    ))
    story.append(Spacer(1, 4))

    # ── 3. PANEL DE CONTROL ────────────────────────────────────────────────────
    h1_block("3.  Panel de Control (Dashboard)", story)
    story.append(Paragraph("3.1  Tarjetas de estadísticas", styles["h2"]))
    story.append(p("Cada tarjeta es clicable y lleva al módulo correspondiente:"))
    table(
        [
            ["Tarjeta", "Descripción"],
            ["QR Activos",             "Número de códigos QR activos generados"],
            ["Préstamos Activos",       "Equipos prestados sin devolver (naranja = hay pendientes)"],
            ["Total Préstamos",         "Histórico de todos los préstamos registrados"],
            ["Sustancias Registradas",  "Total de productos en el inventario FGL 010"],
            ["Sustancias Vencidas",     "Productos con fecha de vencimiento superada (rojo)"],
            ["Sustancias por Vencer",   "Productos que vencen en los próximos 30 días"],
            ["Registros EPP",           "Total de revisiones de elementos de protección"],
            ["EPP Vencidos",            "Elementos con fecha de vencimiento superada (rojo)"],
            ["EPP por Vencer",          "Elementos que vencen en los próximos 30 días"],
        ],
        [5*cm, 11*cm], story,
    )

    story.append(Paragraph("3.2  Alertas Críticas y Próximos Vencimientos", styles["h2"]))
    story.append(p(
        "El panel muestra automáticamente (máx. 5 por categoría) las sustancias vencidas, "
        "EPP con vencimiento superado y préstamos pendientes de devolución. "
        "Si no hay alertas, aparece el mensaje <b>\"Sin alertas críticas\"</b>."
    ))
    story.append(Paragraph("3.3  Actividad Reciente", styles["h2"]))
    story.append(p(
        'Las últimas 10 acciones del sistema (crear, editar, eliminar, devolver). '
        'El enlace <b>"Ver todo →"</b> lleva al Historial completo de auditoría.'
    ))

    # ── 4. GESTIÓN DE QR ──────────────────────────────────────────────────────
    story.append(PageBreak())
    h1_block("4.  Gestión de Códigos QR", story)
    story.append(Paragraph("4.1  Crear un nuevo código QR", styles["h2"]))
    for s in [
        'Clic en <b>"+ Nuevo QR"</b> en la parte superior derecha.',
        "Selecciona el <b>tipo de formulario</b>: FGL 004, FGL 010 o FGL 140.",
        "Escribe el nombre del <b>laboratorio</b> (campo obligatorio).",
        "Agrega una <b>descripción</b> opcional (ej. \"Equipos de medición\").",
        'Clic en <b>"Generar QR"</b>. El código queda activo de inmediato.',
    ]:
        story.append(bp(s))
    story.append(Spacer(1, 6))

    story.append(Paragraph("4.2  Acciones sobre QR existentes", styles["h2"]))
    table(
        [
            ["Botón", "Función"],
            ["Descargar",        "Descarga el QR en formato SVG para imprimir y pegar físicamente en el laboratorio"],
            ["Desactivar/Activar","Desactiva el QR para que no acepte nuevos formularios (útil si cambia el laboratorio)"],
        ],
        [3.5*cm, 12.5*cm], story,
    )
    story.append(note(
        "Se recomienda imprimir el QR en papel adhesivo o plastificado y ubicarlo "
        "en un lugar visible del laboratorio, preferiblemente junto a la puerta o estación de trabajo."
    ))

    # ── 5. FGL 004 ─────────────────────────────────────────────────────────────
    h1_block("5.  FGL 004 — Préstamo de Equipos, Herramientas y EPP", story)
    story.append(Paragraph("5.1  Flujo del usuario / estudiante", styles["h2"]))
    for s in [
        "Escanea el código QR del laboratorio con la cámara del celular.",
        "El formulario se abre en el navegador <b>sin instalar apps ni crear cuenta</b>.",
        "Completa: nombre completo, carné/cédula, elemento, cantidad, fecha y observaciones.",
        'Clic en <b>"Registrar Préstamo"</b>.',
    ]:
        story.append(bp(s))
    story.append(Spacer(1, 6))

    story.append(Paragraph("5.2  Gestión desde el panel admin", styles["h2"]))
    story.append(p(
        "La tabla muestra todos los registros con nombre del solicitante, "
        "elemento, laboratorio, fechas y estado <b>Activo</b> o <b>Devuelto</b>."
    ))
    story.append(p("<b>Filtros disponibles:</b> búsqueda libre, estado (Todos/Activos/Devueltos), rango de fechas de entrega."))
    table(
        [
            ["Acción", "Descripción"],
            ["Devolver", "Marca el préstamo como devuelto y registra fecha y hora de devolución automáticamente"],
            ["Editar",   "Corrige nombre, documento, elemento, cantidad u observaciones del registro"],
            ["Eliminar", "Elimina permanentemente el registro (requiere confirmación)"],
        ],
        [3*cm, 13*cm], story,
    )
    story.append(Paragraph("5.3  Registro manual", styles["h2"]))
    story.append(p(
        'Clic en <b>"+ Nuevo Registro"</b> para ingresar un préstamo desde el panel, '
        "seleccionando el laboratorio de la lista o escribiendo uno nuevo."
    ))

    # ── 6. FGL 010 ─────────────────────────────────────────────────────────────
    story.append(PageBreak())
    h1_block("6.  FGL 010 — Inventario de Sustancias Químicas", story)
    story.append(Paragraph("6.1  Campos del formulario", styles["h2"]))
    table(
        [
            ["Campo", "Descripción", "Obligatorio"],
            ["Nombre del producto",  "Tal como aparece en la ficha de seguridad (FDS)", "Sí"],
            ["Número CAS",           "Identificador químico internacional",             "No"],
            ["Cantidad y unidad",    "Volumen o masa disponible (ej. 500 mL)",          "No"],
            ["Ubicación",            "Estante, gaveta o área dentro del laboratorio",   "No"],
            ["Fecha de vencimiento", "Fecha impresa en el recipiente (AAAA-MM-DD)",     "No"],
            ["Peligrosidad",         "Clase de peligro según NTC 1692",                 "No"],
            ["Controlada",           "Marcar si está en la lista de sustancias controladas","No"],
            ["Cancerígena",          "Marcar si está clasificada como cancerígena",     "No"],
            ["Registrado por",       "Nombre del responsable del registro",             "No"],
        ],
        [4.5*cm, 7.5*cm, 2.5*cm], story,
    )

    story.append(Paragraph("6.2  Alertas de vencimiento", styles["h2"]))
    table(
        [
            ["Indicador", "Significado"],
            ["Fila con fondo rojo + ⚠️ rojo",   "La sustancia está vencida"],
            ["Fecha en amarillo + ⏰",            "La sustancia vence en menos de 30 días"],
            ["Etiqueta naranja \"Controlada\"",   "Sustancia sujeta a control especial"],
            ["Etiqueta roja \"Cancerígena\"",     "Requiere manejo y almacenamiento especial"],
        ],
        [7*cm, 9*cm], story,
    )
    story.append(Paragraph("6.3  Filtros rápidos", styles["h2"]))
    story.append(p("Disponibles en la barra superior: <b>Todas · Controladas · Cancerígenas · Vencidas</b>."))

    # ── 7. FGL 140 ─────────────────────────────────────────────────────────────
    h1_block("7.  FGL 140 — Control de Elementos de Protección (EPP)", story)
    story.append(Paragraph("7.1  Tipos de elementos registrables", styles["h2"]))
    for e in [
        "Ducha de emergencia y Lavaojos",
        "Extintor",
        "Botiquín de primeros auxilios",
        "Kit de derrames (ácidos/bases)",
        "Kit de derrames hidrocarburos",
        "Kit de derrames mercurio",
        "Otro (texto libre)",
    ]:
        story.append(bp(e))
    story.append(Spacer(1, 6))

    story.append(Paragraph("7.2  Campos del formulario", styles["h2"]))
    table(
        [
            ["Campo", "Descripción"],
            ["Tipo de elemento",      "Selección del tipo de EPP a revisar"],
            ["Identificación / Placa","Código o placa del elemento (ej. EXT-001)"],
            ["Periodicidad",          "Frecuencia de revisión: 15 días / 1 mes / 2 meses / Anual / Otro"],
            ["Fecha de revisión",     "Fecha en que se realiza la inspección (obligatoria)"],
            ["Fecha de vencimiento",  "Fecha de vencimiento del elemento (si aplica)"],
            ["Estado",                "Bueno · Regular · Malo"],
            ["Revisado por",          "Nombre del responsable de la inspección"],
            ["Observaciones",         "Anomalías encontradas o comentarios adicionales"],
        ],
        [4.5*cm, 11.5*cm], story,
    )
    story.append(Paragraph("7.3  Filtro por tipo de elemento", styles["h2"]))
    story.append(p(
        "La barra superior permite filtrar los registros por tipo de elemento "
        "(Ducha, Extintor, Botiquín, Kit de derrames, etc.)."
    ))

    # ── 8. HISTORIAL ──────────────────────────────────────────────────────────
    story.append(PageBreak())
    h1_block("8.  Historial de Cambios (Auditoría)", story)
    story.append(p(
        "Registra automáticamente <b>toda acción</b> realizada por los administradores "
        "con fecha, hora exacta, usuario, laboratorio y descripción de la operación."
    ))
    table(
        [
            ["Acción", "Color", "Ejemplo"],
            ["crear",     "Verde",  "Registro manual en Lab. Biomédica"],
            ["editar",    "Azul",   "Edición de Extintor EXT-001"],
            ["eliminar",  "Rojo",   "Eliminación de Ácido sulfúrico"],
            ["devolucion","Morado", "Devolución de Microscopio por Juan Pérez"],
        ],
        [3*cm, 2.5*cm, 10.5*cm], story,
    )
    story.append(p(
        "<b>Filtros disponibles:</b> búsqueda libre por descripción, usuario o laboratorio; "
        "filtro por formulario (FGL-004 / FGL-010 / FGL-140); "
        "filtro por tipo de acción; rango de fechas. "
        "Se muestran hasta <b>500 registros</b> de los más recientes."
    ))

    # ── 9. DESCARGA Y EXPORTACIÓN ──────────────────────────────────────────────
    h1_block("9.  Descarga y Exportación de Registros", story)
    story.append(p(
        "Disponible en la parte inferior de cada módulo FGL, "
        "en la sección <b>\"Opciones de descarga\"</b>. "
        "Puede filtrarse por rango de fechas antes de descargar."
    ))
    table(
        [
            ["Botón", "Formato", "Descripción"],
            ["CSV",                   ".csv",  "Tabla de texto separada por comas, compatible con cualquier hoja de cálculo"],
            ["Excel (Formato oficial)",".xlsx", "Plantilla oficial ITM con los datos del sistema y hoja adicional \"Registros CHECKLAB\""],
            ["Imprimir / PDF",        "HTML",  "Abre ventana lista para imprimir o guardar como PDF desde el navegador"],
        ],
        [4.5*cm, 2*cm, 9.5*cm], story,
    )
    story.append(note(
        "El archivo Excel descargado incluye las hojas originales de la plantilla ITM "
        "(FGL 004 V07 / FGL 010 V09 / FGL 140 V05) con el logo ITM como fondo, "
        "más una hoja adicional \"Registros CHECKLAB\" con todos los datos en formato tabla. "
        "Para FGL 140, los registros también se inyectan en las hojas por tipo de elemento."
    ))

    # ── 10. FLUJO RECOMENDADO ─────────────────────────────────────────────────
    story.append(PageBreak())
    h1_block("10.  Flujo de Uso Recomendado", story)

    story.append(Paragraph("Fase 1 — Configuración inicial (una sola vez)", styles["h2"]))
    for s in [
        "El administrador crea los códigos QR en el panel → menú <b>Códigos QR</b>.",
        "Descarga cada QR en formato SVG.",
        "Imprime y ubica físicamente los QR en los laboratorios correspondientes.",
    ]:
        story.append(bp(s))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Fase 2 — Uso diario (usuarios del laboratorio)", styles["h2"]))
    for s in [
        "El usuario escanea el QR con el celular.",
        "Llena el formulario en el navegador.",
        "El registro queda en la base de datos en tiempo real.",
    ]:
        story.append(bp(s))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Fase 3 — Control y seguimiento (administrador)", styles["h2"]))
    for s in [
        "Revisar el Dashboard para alertas activas al iniciar cada jornada.",
        "Gestionar devoluciones pendientes en FGL 004.",
        "Monitorear vencimientos próximos en FGL 010 y FGL 140.",
        "Descargar reportes mensuales en formato Excel oficial.",
        "Consultar el Historial para auditorías y seguimiento de cambios.",
    ]:
        story.append(bp(s))
    story.append(Spacer(1, 8))

    # ── 11. SEMÁFORO DE COLORES ───────────────────────────────────────────────
    h1_block("11.  Semáforo de Alertas Visuales", story)
    table(
        [
            ["Indicador visual", "Significado"],
            ["Fondo rojo en fila de tabla",       "Elemento o sustancia con vencimiento superado"],
            ["⚠️  rojo junto a la fecha",          "Vencimiento superado — acción inmediata requerida"],
            ["⏰  amarillo junto a la fecha",       "Vence en menos de 30 días — programar revisión"],
            ["Tarjeta naranja en dashboard",       "Hay préstamos de equipos sin devolver"],
            ["Tarjeta roja con conteo en dashboard","Hay vencimientos críticos activos"],
            ["✅  Sin alertas críticas",            "Todos los registros están al día"],
        ],
        [7*cm, 9*cm], story,
    )

    # ── 12. CONSIDERACIONES TÉCNICAS ─────────────────────────────────────────
    h1_block("12.  Consideraciones Técnicas", story)
    table(
        [
            ["Aspecto", "Detalle"],
            ["Conexión requerida",  "Internet activo. Si aparece error de conexión, verificar que el proyecto Supabase esté activo (no pausado)"],
            ["Compatibilidad",      "Cualquier navegador moderno: Chrome, Firefox, Safari, Edge. Formularios optimizados para celular"],
            ["Seguridad",           "Formularios QR solo permiten insertar registros. Lectura y edición requieren autenticación de admin. RLS activado en todas las tablas"],
            ["Sesión admin",        "Persiste hasta cerrar el navegador. No hay timeout automático"],
            ["Base de datos",       "Supabase (PostgreSQL). Plan gratuito pausa el proyecto tras 1 semana de inactividad — reactivar desde supabase.com"],
        ],
        [4.5*cm, 11.5*cm], story,
    )

    # ── PIE DE PORTADA FINAL ──────────────────────────────────────────────────
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=ITM_BLUE))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "CHECKLAB · Institución Universitaria ITM · Laboratorios de Docencia e Investigación · Versión 1.0 · 2025",
        styles["footer"]
    ))

    return story

# ── Generar PDF ────────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=2*cm,
    rightMargin=2*cm,
    topMargin=2.2*cm,
    bottomMargin=2*cm,
    title="CHECKLAB — Manual de Uso",
    author="ITM Laboratorios",
    subject="Sistema de Gestión Logística de Laboratorios",
)

doc.build(build_story(), onFirstPage=on_page, onLaterPages=on_page)
print("PDF generado: " + OUTPUT)
