-- v6.0 POS: Agregar columnas de código de barras, PLU y pesable a producto
-- Ticket: V60-POS-001

-- Nuevas columnas
ALTER TABLE producto
  ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(14),
  ADD COLUMN IF NOT EXISTS plu VARCHAR(5),
  ADD COLUMN IF NOT EXISTS es_pesable BOOLEAN NOT NULL DEFAULT false;

-- Índice UNIQUE parcial: un solo producto activo por tenant con el mismo código de barras
CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_barcode_tenant
  ON producto (tenant_id, codigo_barras)
  WHERE codigo_barras IS NOT NULL AND activo = true;

-- Índice UNIQUE parcial: un solo producto activo por tenant con el mismo PLU
CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_plu_tenant
  ON producto (tenant_id, plu)
  WHERE plu IS NOT NULL AND activo = true;

-- CHECK: no se puede tener PLU sin ser pesable
ALTER TABLE producto
  ADD CONSTRAINT chk_plu_requiere_pesable
  CHECK (plu IS NULL OR es_pesable = true);

-- CHECK: si es pesable, la unidad debe ser kg o gramo
ALTER TABLE producto
  ADD CONSTRAINT chk_pesable_unidad
  CHECK (es_pesable = false OR unidad IN ('kg', 'gramo'));
