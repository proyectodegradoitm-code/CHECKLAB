-- ============================================================
-- CHECKLAB - Schema de base de datos Supabase
-- Multi-tenant: una BD compartida, cada universidad tiene su ORG_ID
-- ============================================================

-- Tabla de organizaciones (referencia, no obligatorio para RLS)
CREATE TABLE IF NOT EXISTS organizaciones (
  id      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre  TEXT NOT NULL,
  slug    TEXT UNIQUE NOT NULL,
  activo  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de códigos QR
CREATE TABLE IF NOT EXISTS qr_codes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo          TEXT UNIQUE NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('fgl004', 'fgl010', 'fgl140')),
  descripcion     TEXT,
  laboratorio     TEXT,
  activo          BOOLEAN DEFAULT true,
  organizacion_id UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- FGL 004 — Préstamo y devolución de equipos
CREATE TABLE IF NOT EXISTS fgl_004 (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_codigo        TEXT,
  nombre           TEXT NOT NULL,
  carnet_cc        TEXT NOT NULL,
  laboratorio      TEXT NOT NULL,
  elemento         TEXT NOT NULL,
  cantidad         INTEGER DEFAULT 1,
  fecha_entrega    TIMESTAMPTZ DEFAULT NOW(),
  fecha_devolucion TIMESTAMPTZ,
  estado           TEXT CHECK (estado IN ('activo', 'devuelto')) DEFAULT 'activo',
  observaciones    TEXT,
  organizacion_id  UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- FGL 010 — Inventario de sustancias químicas
CREATE TABLE IF NOT EXISTS fgl_010 (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_codigo             TEXT,
  nombre_producto       TEXT NOT NULL,
  cas                   TEXT,
  laboratorio           TEXT NOT NULL,
  cantidad_actual       DECIMAL,
  unidad                TEXT,
  ubicacion             TEXT,
  fecha_vencimiento     DATE,
  peligrosidad          TEXT,
  sustancia_controlada  BOOLEAN DEFAULT false,
  sustancia_cancerigena BOOLEAN DEFAULT false,
  estado_vigencia       TEXT DEFAULT 'vigente',
  observaciones         TEXT,
  organizacion_id       UUID,
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- FGL 140 — Control de elementos de actuación y protección (EPP)
CREATE TABLE IF NOT EXISTS fgl_140 (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_codigo        TEXT,
  laboratorio      TEXT NOT NULL,
  elemento_tipo    TEXT NOT NULL,
  identificacion   TEXT,
  fecha_revision   DATE NOT NULL,
  fecha_vencimiento DATE,
  estado           TEXT CHECK (estado IN ('bueno', 'regular', 'malo')) DEFAULT 'bueno',
  periodicidad     TEXT,
  revisado_por     TEXT,
  observaciones    TEXT,
  organizacion_id  UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tabla           TEXT NOT NULL,
  registro_id     UUID,
  accion          TEXT NOT NULL,
  descripcion     TEXT NOT NULL,
  usuario         TEXT,
  laboratorio     TEXT,
  organizacion_id UUID,
  datos           JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fgl_004  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fgl_010  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fgl_140  ENABLE ROW LEVEL SECURITY;

-- Acceso público: leer QR activos para validar formularios
CREATE POLICY "public_read_qrcodes"
  ON qr_codes FOR SELECT TO anon
  USING (activo = true);

-- Acceso público: insertar registros via formulario QR
CREATE POLICY "public_insert_fgl004"
  ON fgl_004 FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public_insert_fgl010"
  ON fgl_010 FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public_insert_fgl140"
  ON fgl_140 FOR INSERT TO anon WITH CHECK (true);

-- Admin (autenticado): acceso total
CREATE POLICY "admin_all_qrcodes"
  ON qr_codes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_fgl004"
  ON fgl_004 FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_fgl010"
  ON fgl_010 FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_fgl140"
  ON fgl_140 FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_audit"
  ON audit_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_organizaciones"
  ON organizaciones FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- Migration: add organizacion_id to existing tables
-- Run this block on an existing database (idempotent)
-- ============================================================
ALTER TABLE qr_codes  ADD COLUMN IF NOT EXISTS organizacion_id UUID;
ALTER TABLE fgl_004   ADD COLUMN IF NOT EXISTS organizacion_id UUID;
ALTER TABLE fgl_010   ADD COLUMN IF NOT EXISTS organizacion_id UUID;
ALTER TABLE fgl_140   ADD COLUMN IF NOT EXISTS organizacion_id UUID;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS organizacion_id UUID;

-- Indexes for multi-tenant query performance
CREATE INDEX IF NOT EXISTS idx_qr_org     ON qr_codes  (organizacion_id);
CREATE INDEX IF NOT EXISTS idx_f004_org   ON fgl_004   (organizacion_id);
CREATE INDEX IF NOT EXISTS idx_f010_org   ON fgl_010   (organizacion_id);
CREATE INDEX IF NOT EXISTS idx_f140_org   ON fgl_140   (organizacion_id);
CREATE INDEX IF NOT EXISTS idx_audit_org  ON audit_log (organizacion_id);

-- Seed ITM as the default organization (use your own UUID in production)
INSERT INTO organizaciones (id, nombre, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'ITM Laboratorios', 'itm')
ON CONFLICT (slug) DO NOTHING;
