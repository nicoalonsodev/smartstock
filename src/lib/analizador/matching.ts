import type { SupabaseClient } from '@supabase/supabase-js';

import { llamarGeminiTexto } from '@/lib/ia/gemini';
import { verificarLimiteIA } from '@/lib/ia/limite';
import { PROMPT_MATCHING_FUZZY } from '@/lib/ia/prompts';
import { normalizarString } from '@/lib/normalizador/normalizar';
import type { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ListaPreciosItem = Database['public']['Tables']['lista_precios_item']['Row'];

interface ProductoCatalogo {
  id: string;
  codigo: string;
  nombre: string;
}

interface MatchResult {
  itemId: string;
  productoId: string;
  confidence: number;
  metodo: 'codigo_exacto' | 'nombre_normalizado' | 'ia_fuzzy';
}

export interface MatchingOutput {
  matcheados: (ListaPreciosItem & { match_metodo: string })[];
  dudosos: (ListaPreciosItem & { match_metodo: string })[];
  nuevos: ListaPreciosItem[];
  resumen: {
    total: number;
    seguros: number;
    dudosos: number;
    sin_match: number;
    ia_usada: boolean;
  };
}

const GEMINI_BATCH_SIZE = 25;

// ---------------------------------------------------------------------------
// Level 1 — Exact code match
// ---------------------------------------------------------------------------

function matchPorCodigo(
  items: ListaPreciosItem[],
  productosPorCodigo: Map<string, ProductoCatalogo>,
): { matched: MatchResult[]; remaining: ListaPreciosItem[] } {
  const matched: MatchResult[] = [];
  const remaining: ListaPreciosItem[] = [];

  for (const item of items) {
    if (!item.codigo_proveedor) {
      remaining.push(item);
      continue;
    }

    const codigoNorm = item.codigo_proveedor.trim().toLowerCase();
    const producto = productosPorCodigo.get(codigoNorm);

    if (producto) {
      matched.push({
        itemId: item.id,
        productoId: producto.id,
        confidence: 1.0,
        metodo: 'codigo_exacto',
      });
    } else {
      remaining.push(item);
    }
  }

  return { matched, remaining };
}

// ---------------------------------------------------------------------------
// Level 2 — Normalized name match
// ---------------------------------------------------------------------------

function matchPorNombre(
  items: ListaPreciosItem[],
  productosPorNombre: Map<string, ProductoCatalogo>,
  productosUsados: Set<string>,
): { matched: MatchResult[]; remaining: ListaPreciosItem[] } {
  const matched: MatchResult[] = [];
  const remaining: ListaPreciosItem[] = [];

  for (const item of items) {
    const nombreNorm = item.nombre_normalizado || normalizarString(item.nombre_raw);
    const producto = productosPorNombre.get(nombreNorm);

    if (producto && !productosUsados.has(producto.id)) {
      matched.push({
        itemId: item.id,
        productoId: producto.id,
        confidence: 0.95,
        metodo: 'nombre_normalizado',
      });
      productosUsados.add(producto.id);
    } else {
      remaining.push(item);
    }
  }

  return { matched, remaining };
}

// ---------------------------------------------------------------------------
// Level 3 — Gemini fuzzy matching (batched)
// ---------------------------------------------------------------------------

interface GeminiFuzzyMatch {
  item_id: string;
  producto_id: string;
  confidence: number;
  razon: string;
}

async function matchPorIA(
  items: ListaPreciosItem[],
  productosDisponibles: ProductoCatalogo[],
): Promise<MatchResult[]> {
  if (items.length === 0 || productosDisponibles.length === 0) return [];

  const allMatches: MatchResult[] = [];

  for (let i = 0; i < items.length; i += GEMINI_BATCH_SIZE) {
    const batch = items.slice(i, i + GEMINI_BATCH_SIZE);

    const itemsPayload = batch.map((it) => ({
      id: it.id,
      nombre: it.nombre_raw,
      codigo: it.codigo_proveedor,
    }));

    const productosPayload = productosDisponibles.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo,
    }));

    const prompt = `${PROMPT_MATCHING_FUZZY}\n\n${JSON.stringify({ items: itemsPayload, productos: productosPayload })}`;

    let respuesta: string;
    try {
      respuesta = await llamarGeminiTexto(prompt);
    } catch {
      continue;
    }

    let parsed: { matches?: GeminiFuzzyMatch[] };
    try {
      parsed = JSON.parse(respuesta) as { matches?: GeminiFuzzyMatch[] };
    } catch {
      const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      try {
        parsed = JSON.parse(jsonMatch[0]) as { matches?: GeminiFuzzyMatch[] };
      } catch {
        continue;
      }
    }

    if (!Array.isArray(parsed.matches)) continue;

    const itemIds = new Set(batch.map((it) => it.id));
    const prodIds = new Set(productosDisponibles.map((p) => p.id));
    const usedItems = new Set<string>();
    const usedProds = new Set<string>();

    for (const m of parsed.matches) {
      if (
        !itemIds.has(m.item_id) ||
        !prodIds.has(m.producto_id) ||
        usedItems.has(m.item_id) ||
        usedProds.has(m.producto_id)
      ) continue;

      const confidence = typeof m.confidence === 'number'
        ? Math.max(0, Math.min(1, m.confidence))
        : 0;

      if (confidence < 0.5) continue;

      allMatches.push({
        itemId: m.item_id,
        productoId: m.producto_id,
        confidence,
        metodo: 'ia_fuzzy',
      });
      usedItems.add(m.item_id);
      usedProds.add(m.producto_id);
    }
  }

  return allMatches;
}

// ---------------------------------------------------------------------------
// Public — Run full matching pipeline
// ---------------------------------------------------------------------------

export async function ejecutarMatching(
  supabase: SupabaseClient<Database>,
  listaId: string,
  ctx: { tenantId: string; userId: string },
): Promise<MatchingOutput> {
  const { data: items, error: itemsErr } = await supabase
    .from('lista_precios_item')
    .select('*')
    .eq('lista_id', listaId)
    .order('orden');

  if (itemsErr) throw new Error(`Error al cargar items: ${itemsErr.message}`);
  if (!items || items.length === 0) throw new Error('La lista no tiene items');

  const { data: productos, error: prodErr } = await supabase
    .from('producto')
    .select('id, codigo, nombre')
    .eq('activo', true);

  if (prodErr) throw new Error(`Error al cargar productos: ${prodErr.message}`);

  const catalogoProductos: ProductoCatalogo[] = (productos ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
  }));

  // Build lookup maps
  const productosPorCodigo = new Map<string, ProductoCatalogo>();
  const productosPorNombre = new Map<string, ProductoCatalogo>();

  for (const p of catalogoProductos) {
    if (p.codigo) {
      productosPorCodigo.set(p.codigo.trim().toLowerCase(), p);
    }
    const nombreNorm = normalizarString(p.nombre);
    if (nombreNorm && !productosPorNombre.has(nombreNorm)) {
      productosPorNombre.set(nombreNorm, p);
    }
  }

  // Level 1: código exacto
  const level1 = matchPorCodigo(items, productosPorCodigo);

  // Level 2: nombre normalizado
  const productosUsados = new Set(level1.matched.map((m) => m.productoId));
  const level2 = matchPorNombre(level1.remaining, productosPorNombre, productosUsados);

  // Level 3: IA fuzzy (only for remaining, if there are products left)
  let level3Matches: MatchResult[] = [];
  let iaUsada = false;

  if (level2.remaining.length > 0 && catalogoProductos.length > 0) {
    const limite = await verificarLimiteIA(supabase);
    if (limite.permitido) {
      const productosUsadosAll = new Set([
        ...level1.matched.map((m) => m.productoId),
        ...level2.matched.map((m) => m.productoId),
      ]);
      const productosDisponibles = catalogoProductos.filter(
        (p) => !productosUsadosAll.has(p.id),
      );

      level3Matches = await matchPorIA(level2.remaining, productosDisponibles);
      iaUsada = true;

      // Log IA usage
      await supabase.from('importacion_log').insert({
        tenant_id: ctx.tenantId,
        proveedor_id: null,
        archivo_nombre: `[IA matching] lista ${listaId}`,
        origen: 'ia_pdf',
        total_filas: 0,
        filas_exitosas: 0,
        filas_con_error: 0,
        productos_creados: 0,
        productos_actualizados: 0,
        detalle_errores: null,
        usuario_id: ctx.userId,
      });
    }
  }

  // Merge all matches
  const allMatches = [...level1.matched, ...level2.matched, ...level3Matches];
  const matchByItem = new Map(allMatches.map((m) => [m.itemId, m]));

  // Update each item in DB
  for (const match of allMatches) {
    await supabase
      .from('lista_precios_item')
      .update({
        producto_id: match.productoId,
        match_confidence: match.confidence,
        match_metodo: match.metodo,
      })
      .eq('id', match.itemId);
  }

  // Re-read updated items for grouping
  const { data: updatedItems } = await supabase
    .from('lista_precios_item')
    .select('*')
    .eq('lista_id', listaId)
    .order('orden');

  const finalItems = updatedItems ?? items;

  // Group results
  const matcheados: (ListaPreciosItem & { match_metodo: string })[] = [];
  const dudosos: (ListaPreciosItem & { match_metodo: string })[] = [];
  const nuevos: ListaPreciosItem[] = [];

  for (const item of finalItems) {
    const match = matchByItem.get(item.id);
    if (!match) {
      nuevos.push(item);
    } else if (match.confidence >= 0.8) {
      matcheados.push({ ...item, match_metodo: match.metodo });
    } else {
      dudosos.push({ ...item, match_metodo: match.metodo });
    }
  }

  // Update lista_precios counters
  await supabase
    .from('lista_precios')
    .update({
      items_matcheados_seguros: matcheados.length,
      items_matcheados_dudosos: dudosos.length,
      items_sin_match: nuevos.length,
    })
    .eq('id', listaId);

  return {
    matcheados,
    dudosos,
    nuevos,
    resumen: {
      total: finalItems.length,
      seguros: matcheados.length,
      dudosos: dudosos.length,
      sin_match: nuevos.length,
      ia_usada: iaUsada,
    },
  };
}
