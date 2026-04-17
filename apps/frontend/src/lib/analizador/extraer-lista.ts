import type { SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

import { GeminiError, llamarGemini } from '@/lib/ia/gemini';
import { verificarLimiteIA } from '@/lib/ia/limite';
import { PROMPT_EXTRACCION_PRECIOS } from '@/lib/ia/prompts';
import { normalizarString } from '@/lib/normalizador/normalizar';
import { parsearPrecioArgentino } from '@/lib/normalizador/validar';
import type { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrigenPrecio = Database['public']['Enums']['origen_precio'];
type UnidadMedida = Database['public']['Enums']['unidad_medida'];

export interface ItemExtraido {
  orden: number;
  codigo_proveedor: string | null;
  nombre_raw: string;
  nombre_normalizado: string;
  precio_lista: number;
  unidad: UnidadMedida | null;
}

export interface ResultadoExtraccion {
  items: ItemExtraido[];
  origen: OrigenPrecio;
  iaUsada: boolean;
}

export interface CrearListaParams {
  tenantId: string;
  userId: string;
  proveedorId: string;
  nombreArchivo: string;
  mimeType: string;
  items: ItemExtraido[];
  origen: OrigenPrecio;
  storagePath: string | null;
  fechaVigenciaDesde?: string | null;
  fechaVigenciaHasta?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UNIDADES_VALIDAS: Set<string> = new Set<string>([
  'unidad', 'kg', 'litro', 'metro', 'caja', 'pack', 'gramo', 'ml',
]);

const HEADER_ALIASES_PRECIO: string[] = [
  'precio', 'pvp', 'precio_venta', 'pventa', 'precio_unitario', 'punit',
  'valor', 'price', 'venta', 'precio_lista', 'lista', 'costo',
  'precio_costo', 'pcosto', 'neto', 'importe', 'tarifa',
];
const HEADER_ALIASES_NOMBRE: string[] = [
  'nombre', 'descripcion', 'producto', 'item', 'articulo', 'detalle',
  'desc', 'name', 'denominacion', 'titulo',
];
const HEADER_ALIASES_CODIGO: string[] = [
  'codigo', 'cod', 'code', 'sku', 'ref', 'referencia', 'art', 'articulo',
  'id', 'item', 'barras', 'ean',
];
const HEADER_ALIASES_UNIDAD: string[] = [
  'unidad', 'um', 'medida', 'unit', 'uom', 'umed',
];

// ---------------------------------------------------------------------------
// Excel / CSV extraction (server-side)
// ---------------------------------------------------------------------------

function detectarColumna(
  headers: string[],
  aliases: string[],
  usadas: Set<number>,
): number {
  const aliasesNorm = aliases.map(normalizarString);

  for (let i = 0; i < headers.length; i++) {
    if (usadas.has(i)) continue;
    const hNorm = normalizarString(headers[i]);
    if (aliasesNorm.includes(hNorm)) return i;
  }

  for (let i = 0; i < headers.length; i++) {
    if (usadas.has(i)) continue;
    const hNorm = normalizarString(headers[i]);
    if (aliasesNorm.some((a) => hNorm.includes(a) || a.includes(hNorm))) return i;
  }

  return -1;
}

function inferirUnidad(val: unknown): UnidadMedida | null {
  if (val == null) return null;
  const s = normalizarString(String(val));
  if (UNIDADES_VALIDAS.has(s)) return s as UnidadMedida;
  return null;
}

export function extraerItemsExcel(buffer: ArrayBuffer, nombreArchivo: string): ItemExtraido[] {
  const esCsv = nombreArchivo.toLowerCase().endsWith('.csv');
  let workbook: XLSX.WorkBook;

  if (esCsv) {
    const decoder = new TextDecoder('utf-8');
    let text = decoder.decode(buffer);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    workbook = XLSX.read(text, { type: 'string' });
  } else {
    const data = new Uint8Array(buffer);
    workbook = XLSX.read(data, { type: 'array' });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('El archivo está vacío');

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });

  if (rows.length === 0) throw new Error('El archivo no contiene datos');

  const headers = Object.keys(rows[0]).filter((h) => h && String(h).trim() !== '');
  const usadas = new Set<number>();

  const idxNombre = detectarColumna(headers, HEADER_ALIASES_NOMBRE, usadas);
  if (idxNombre >= 0) usadas.add(idxNombre);

  const idxPrecio = detectarColumna(headers, HEADER_ALIASES_PRECIO, usadas);
  if (idxPrecio >= 0) usadas.add(idxPrecio);

  const idxCodigo = detectarColumna(headers, HEADER_ALIASES_CODIGO, usadas);
  if (idxCodigo >= 0) usadas.add(idxCodigo);

  const idxUnidad = detectarColumna(headers, HEADER_ALIASES_UNIDAD, usadas);

  if (idxNombre < 0) throw new Error('No se detectó una columna de nombre/descripción');
  if (idxPrecio < 0) throw new Error('No se detectó una columna de precio');

  const hNombre = headers[idxNombre];
  const hPrecio = headers[idxPrecio];
  const hCodigo = idxCodigo >= 0 ? headers[idxCodigo] : null;
  const hUnidad = idxUnidad >= 0 ? headers[idxUnidad] : null;

  const items: ItemExtraido[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nombre = row[hNombre] != null ? String(row[hNombre]).trim() : '';
    if (!nombre) continue;

    const precio = parsearPrecioArgentino(row[hPrecio]);
    if (precio == null || precio < 0) continue;

    const codigo = hCodigo && row[hCodigo] != null
      ? String(row[hCodigo]).trim() || null
      : null;
    const unidad = hUnidad ? inferirUnidad(row[hUnidad]) : null;

    items.push({
      orden: items.length + 1,
      codigo_proveedor: codigo,
      nombre_raw: nombre,
      nombre_normalizado: normalizarString(nombre),
      precio_lista: precio,
      unidad,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Gemini extraction (PDF / image)
// ---------------------------------------------------------------------------

interface GeminiProducto {
  codigo: string | null;
  nombre: string;
  precio: number;
  unidad: string | null;
}

function parseGeminiResponse(raw: string): GeminiProducto[] {
  let parsed: { productos?: GeminiProducto[] };
  try {
    parsed = JSON.parse(raw) as { productos?: GeminiProducto[] };
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('La IA no devolvió un JSON válido');
    parsed = JSON.parse(jsonMatch[0]) as { productos?: GeminiProducto[] };
  }

  if (!Array.isArray(parsed.productos)) {
    throw new Error('La respuesta de IA no contiene un array de productos');
  }
  return parsed.productos;
}

export async function extraerItemsIA(
  base64: string,
  mimeType: string,
  supabase: SupabaseClient<Database>,
  ctx: { tenantId: string; userId: string },
  fileName: string,
): Promise<ItemExtraido[]> {
  const limite = await verificarLimiteIA(supabase);
  if (!limite.permitido) {
    throw new LimiteIAError(limite.usadas, limite.limite);
  }

  const textoRespuesta = await llamarGemini(PROMPT_EXTRACCION_PRECIOS, {
    base64,
    mimeType,
  });

  const productos = parseGeminiResponse(textoRespuesta);

  // Registrar uso de IA (comparte límite mensual con el módulo ia_precios)
  await supabase.from('importacion_log').insert({
    tenant_id: ctx.tenantId,
    proveedor_id: null,
    archivo_nombre: `[IA lista] ${fileName}`,
    origen: 'ia_pdf',
    total_filas: 0,
    filas_exitosas: 0,
    filas_con_error: 0,
    productos_creados: 0,
    productos_actualizados: 0,
    detalle_errores: null,
    usuario_id: ctx.userId,
  });

  return productos
    .filter((p) => p.nombre && String(p.nombre).trim() !== '')
    .map((p, i) => ({
      orden: i + 1,
      codigo_proveedor: p.codigo != null ? String(p.codigo).trim() || null : null,
      nombre_raw: String(p.nombre).trim(),
      nombre_normalizado: normalizarString(String(p.nombre)),
      precio_lista: typeof p.precio === 'number' && p.precio >= 0 ? p.precio : 0,
      unidad: p.unidad ? inferirUnidad(p.unidad) : null,
    }));
}

export class LimiteIAError extends Error {
  constructor(
    readonly usadas: number,
    readonly limite: number,
  ) {
    super('Límite mensual de extracciones IA alcanzado');
    this.name = 'LimiteIAError';
  }
}

// ---------------------------------------------------------------------------
// Storage upload
// ---------------------------------------------------------------------------

export async function subirArchivoStorage(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  buffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
): Promise<string | null> {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${tenantId}/listas/${timestamp}_${safeName}`;

  const { error } = await supabase.storage
    .from('listas-precios')
    .upload(storagePath, Buffer.from(buffer), {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error('[analizador] Storage upload error:', error.message);
    return null;
  }

  return storagePath;
}

// ---------------------------------------------------------------------------
// Persist lista_precios + items
// ---------------------------------------------------------------------------

export async function crearListaConItems(
  supabase: SupabaseClient<Database>,
  params: CrearListaParams,
) {
  const { data: lista, error: listaErr } = await supabase
    .from('lista_precios')
    .insert({
      tenant_id: params.tenantId,
      proveedor_id: params.proveedorId,
      usuario_id: params.userId,
      nombre_archivo: params.nombreArchivo,
      mime_type: params.mimeType,
      storage_path: params.storagePath,
      origen_extraccion: params.origen,
      estado: 'pendiente',
      total_items: params.items.length,
      fecha_vigencia_desde: params.fechaVigenciaDesde ?? null,
      fecha_vigencia_hasta: params.fechaVigenciaHasta ?? null,
    })
    .select()
    .single();

  if (listaErr || !lista) {
    throw new Error(`Error al crear lista: ${listaErr?.message ?? 'sin datos'}`);
  }

  if (params.items.length > 0) {
    const itemsInsert = params.items.map((item) => ({
      lista_id: lista.id,
      orden: item.orden,
      codigo_proveedor: item.codigo_proveedor,
      nombre_raw: item.nombre_raw,
      nombre_normalizado: item.nombre_normalizado,
      precio_lista: item.precio_lista,
      unidad: item.unidad,
    }));

    const { error: itemsErr } = await supabase
      .from('lista_precios_item')
      .insert(itemsInsert);

    if (itemsErr) {
      throw new Error(`Error al crear items: ${itemsErr.message}`);
    }
  }

  return lista;
}

// Re-export GeminiError for route-level error handling
export { GeminiError } from '@/lib/ia/gemini';
