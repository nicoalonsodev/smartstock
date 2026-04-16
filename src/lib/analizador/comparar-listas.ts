import type { SupabaseClient } from '@supabase/supabase-js';

import { llamarGeminiTexto } from '@/lib/ia/gemini';
import { verificarLimiteIA } from '@/lib/ia/limite';
import type { Database } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ListaPreciosItem = Database['public']['Tables']['lista_precios_item']['Row'];

interface ItemConProveedor {
  lista_id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  item_id: string;
  nombre_raw: string;
  nombre_normalizado: string | null;
  codigo_proveedor: string | null;
  precio_lista: number;
  producto_id: string | null;
}

interface FilaComparativa {
  nombre_unificado: string;
  producto_id: string | null;
  precios: Record<string, {
    proveedor_id: string;
    proveedor_nombre: string;
    item_id: string;
    precio: number;
    es_mejor: boolean;
  }>;
  mejor_precio: number;
  peor_precio: number;
  ahorro_vs_peor: number;
  ahorro_vs_peor_pct: number;
}

export interface ComparacionListasOutput {
  filas: FilaComparativa[];
  proveedores: { id: string; nombre: string; lista_id: string }[];
  ahorro_total_potencial: number;
  ahorro_pct_potencial: number;
  total_items_cruzados: number;
  ia_usada: boolean;
}

// ---------------------------------------------------------------------------
// Prompt for cross-list matching
// ---------------------------------------------------------------------------

const PROMPT_CROSS_MATCHING = `Sos un asistente que cruza items entre listas de precios de distintos proveedores para encontrar productos equivalentes.

Te doy N listas, cada una con items identificados por lista_id e item_id.

Tu tarea: agrupar items que se refieran al MISMO producto entre distintas listas.

Devuelve ÚNICAMENTE un JSON válido:
{
  "grupos": [
    {
      "nombre_unificado": "string (nombre descriptivo del producto)",
      "items": [
        { "lista_id": "string", "item_id": "string" }
      ]
    }
  ]
}

Reglas:
- Solo agrupar items que claramente son el mismo producto (aunque el nombre varíe)
- Un item solo puede pertenecer a UN grupo
- No agrupar items de la misma lista entre sí
- Cada grupo debe tener items de al menos 2 listas distintas
- Preferir NO agrupar antes que agrupar mal
- Si no hay cruces posibles, devolvé {"grupos": []}
- Máximo 200 grupos`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Phase 1: match items across lists using producto_id (deterministic).
 */
function cruzarPorProductoId(
  itemsPorLista: Map<string, ItemConProveedor[]>,
): { grupos: Map<string, ItemConProveedor[]>; sinCruzar: ItemConProveedor[] } {
  // Group by producto_id across lists
  const porProducto = new Map<string, ItemConProveedor[]>();

  for (const [, items] of itemsPorLista) {
    for (const item of items) {
      if (!item.producto_id) continue;
      if (!porProducto.has(item.producto_id)) porProducto.set(item.producto_id, []);
      porProducto.get(item.producto_id)!.push(item);
    }
  }

  // Only keep groups with items from 2+ different lists
  const grupos = new Map<string, ItemConProveedor[]>();
  const itemsUsados = new Set<string>();

  for (const [pid, items] of porProducto) {
    const listasDistintas = new Set(items.map((i) => i.lista_id));
    if (listasDistintas.size >= 2) {
      // Keep only one item per list (first occurrence)
      const porLista = new Map<string, ItemConProveedor>();
      for (const it of items) {
        if (!porLista.has(it.lista_id)) porLista.set(it.lista_id, it);
      }
      const grupo = [...porLista.values()];
      grupos.set(pid, grupo);
      for (const it of grupo) itemsUsados.add(it.item_id);
    }
  }

  // Collect unmatched items
  const sinCruzar: ItemConProveedor[] = [];
  for (const [, items] of itemsPorLista) {
    for (const item of items) {
      if (!itemsUsados.has(item.item_id)) sinCruzar.push(item);
    }
  }

  return { grupos, sinCruzar };
}

/**
 * Phase 2: use IA to cross-match remaining items.
 */
async function cruzarConIA(
  items: ItemConProveedor[],
  ctx: { supabase: SupabaseClient<Database>; tenantId: string; userId: string },
): Promise<Map<string, ItemConProveedor[]>> {
  if (items.length === 0) return new Map();

  const limite = await verificarLimiteIA(ctx.supabase);
  if (!limite.permitido) return new Map();

  // Build payload grouped by lista
  const porLista = new Map<string, { item_id: string; nombre: string; codigo: string | null }[]>();
  const itemMap = new Map<string, ItemConProveedor>();

  for (const it of items) {
    itemMap.set(it.item_id, it);
    if (!porLista.has(it.lista_id)) porLista.set(it.lista_id, []);
    porLista.get(it.lista_id)!.push({
      item_id: it.item_id,
      nombre: it.nombre_raw,
      codigo: it.codigo_proveedor,
    });
  }

  const listas = [...porLista.entries()].map(([listaId, items_]) => ({
    lista_id: listaId,
    items: items_.slice(0, 100), // Cap per list
  }));

  const prompt = `${PROMPT_CROSS_MATCHING}\n\n${JSON.stringify({ listas })}`;

  let respuesta: string;
  try {
    respuesta = await llamarGeminiTexto(prompt);
  } catch {
    return new Map();
  }

  // Log IA usage
  await ctx.supabase.from('importacion_log').insert({
    tenant_id: ctx.tenantId,
    proveedor_id: null,
    archivo_nombre: '[IA cross-matching] comparación de listas',
    origen: 'ia_pdf',
    total_filas: 0,
    filas_exitosas: 0,
    filas_con_error: 0,
    productos_creados: 0,
    productos_actualizados: 0,
    detalle_errores: null,
    usuario_id: ctx.userId,
  });

  let parsed: { grupos?: { nombre_unificado: string; items: { lista_id: string; item_id: string }[] }[] };
  try {
    parsed = JSON.parse(respuesta);
  } catch {
    const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return new Map();
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return new Map();
    }
  }

  if (!Array.isArray(parsed.grupos)) return new Map();

  const grupos = new Map<string, ItemConProveedor[]>();
  const usados = new Set<string>();

  for (const g of parsed.grupos) {
    if (!g.nombre_unificado || !Array.isArray(g.items)) continue;

    const grupoItems: ItemConProveedor[] = [];
    const listasEnGrupo = new Set<string>();

    for (const ref of g.items) {
      const it = itemMap.get(ref.item_id);
      if (!it || usados.has(it.item_id) || listasEnGrupo.has(it.lista_id)) continue;
      grupoItems.push(it);
      listasEnGrupo.add(it.lista_id);
      usados.add(it.item_id);
    }

    if (grupoItems.length >= 2) {
      grupos.set(`ia_${g.nombre_unificado}`, grupoItems);
    }
  }

  return grupos;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function compararListas(
  supabase: SupabaseClient<Database>,
  listaIds: string[],
  ctx: { tenantId: string; userId: string },
): Promise<ComparacionListasOutput> {
  if (listaIds.length < 2 || listaIds.length > 5) {
    throw new Error('Se requieren entre 2 y 5 listas para comparar');
  }

  // 1. Load lists + items
  const { data: listas } = await supabase
    .from('lista_precios')
    .select('id, proveedor_id, nombre_archivo')
    .in('id', listaIds);

  if (!listas || listas.length < 2) {
    throw new Error('No se encontraron suficientes listas');
  }

  // Get proveedor names
  const provIds = [...new Set(listas.map((l) => l.proveedor_id))];
  const { data: proveedores } = await supabase
    .from('proveedor')
    .select('id, nombre')
    .in('id', provIds);
  const provNombreMap = new Map((proveedores ?? []).map((p) => [p.id, p.nombre]));

  const itemsPorLista = new Map<string, ItemConProveedor[]>();

  for (const lista of listas) {
    const { data: items } = await supabase
      .from('lista_precios_item')
      .select('*')
      .eq('lista_id', lista.id)
      .order('orden');

    const mapped: ItemConProveedor[] = (items ?? []).map((it: ListaPreciosItem) => ({
      lista_id: lista.id,
      proveedor_id: lista.proveedor_id,
      proveedor_nombre: provNombreMap.get(lista.proveedor_id) ?? lista.proveedor_id,
      item_id: it.id,
      nombre_raw: it.nombre_raw,
      nombre_normalizado: it.nombre_normalizado,
      codigo_proveedor: it.codigo_proveedor,
      precio_lista: it.precio_lista,
      producto_id: it.producto_id,
    }));

    itemsPorLista.set(lista.id, mapped);
  }

  // 2. Deterministic cross by producto_id
  const { grupos: gruposDet, sinCruzar } = cruzarPorProductoId(itemsPorLista);

  // 3. IA cross-matching for remaining
  const gruposIA = await cruzarConIA(sinCruzar, { supabase, tenantId: ctx.tenantId, userId: ctx.userId });
  const iaUsada = gruposIA.size > 0;

  // 4. Build comparative table
  const filas: FilaComparativa[] = [];

  const buildFila = (nombre: string, items: ItemConProveedor[], productoId: string | null) => {
    const precios: FilaComparativa['precios'] = {};
    for (const it of items) {
      precios[it.lista_id] = {
        proveedor_id: it.proveedor_id,
        proveedor_nombre: it.proveedor_nombre,
        item_id: it.item_id,
        precio: it.precio_lista,
        es_mejor: false,
      };
    }

    const preciosArr = Object.values(precios).map((p) => p.precio);
    const mejor = Math.min(...preciosArr);
    const peor = Math.max(...preciosArr);

    // Mark best price
    for (const key of Object.keys(precios)) {
      if (precios[key].precio === mejor) {
        precios[key].es_mejor = true;
      }
    }

    filas.push({
      nombre_unificado: nombre,
      producto_id: productoId,
      precios,
      mejor_precio: round2(mejor),
      peor_precio: round2(peor),
      ahorro_vs_peor: round2(peor - mejor),
      ahorro_vs_peor_pct: peor > 0 ? round2(((peor - mejor) / peor) * 100) : 0,
    });
  };

  // From deterministic groups
  const prodIds = [...gruposDet.keys()];
  const prodNombreMap = new Map<string, string>();
  if (prodIds.length > 0) {
    const { data: prods } = await supabase
      .from('producto')
      .select('id, nombre')
      .in('id', prodIds);
    for (const p of prods ?? []) prodNombreMap.set(p.id, p.nombre);
  }

  for (const [pid, items] of gruposDet) {
    const nombre = prodNombreMap.get(pid) ?? items[0].nombre_raw;
    buildFila(nombre, items, pid);
  }

  // From IA groups
  for (const [key, items] of gruposIA) {
    const nombre = key.replace(/^ia_/, '');
    const productoId = items.find((i) => i.producto_id)?.producto_id ?? null;
    buildFila(nombre, items, productoId);
  }

  filas.sort((a, b) => b.ahorro_vs_peor - a.ahorro_vs_peor);

  // 5. Calculate totals
  const ahorroTotal = filas.reduce((s, f) => s + f.ahorro_vs_peor, 0);
  const totalPeor = filas.reduce((s, f) => s + f.peor_precio, 0);
  const ahorroPct = totalPeor > 0 ? round2((ahorroTotal / totalPeor) * 100) : 0;

  const proveedoresInfo = listas.map((l) => ({
    id: l.proveedor_id,
    nombre: provNombreMap.get(l.proveedor_id) ?? l.proveedor_id,
    lista_id: l.id,
  }));

  return {
    filas,
    proveedores: proveedoresInfo,
    ahorro_total_potencial: round2(ahorroTotal),
    ahorro_pct_potencial: ahorroPct,
    total_items_cruzados: filas.length,
    ia_usada: iaUsada,
  };
}
