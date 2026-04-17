import { getTenantSession } from '@/lib/api/tenant-session';
import { GeminiError, llamarGemini } from '@/lib/ia/gemini';
import { verificarLimiteIA } from '@/lib/ia/limite';
import { PROMPT_EXTRACCION_PRECIOS } from '@/lib/ia/prompts';
import { moduloGuard } from '@/lib/modulos/guard';
import { NextResponse } from 'next/server';

interface ProductoExtraido {
  codigo: string | null;
  nombre: string;
  precio: number;
  unidad: string | null;
}

interface GeminiResult {
  productos: ProductoExtraido[];
}

const MIME_TYPES_PERMITIDOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const guard = await moduloGuard('ia_precios');
  if (!guard.allowed) return guard.response;

  const sessionCtx = await getTenantSession();
  if ('error' in sessionCtx) return sessionCtx.error;
  const { supabase, tenantId, userId } = sessionCtx;

  let limiteInfo: Awaited<ReturnType<typeof verificarLimiteIA>>;
  try {
    limiteInfo = await verificarLimiteIA(supabase);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  if (!limiteInfo.permitido) {
    return NextResponse.json(
      { error: 'Límite mensual de extracciones alcanzado' },
      { status: 429 },
    );
  }

  const formData = await request.formData();
  const file = formData.get('archivo') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
  }

  if (!MIME_TYPES_PERMITIDOS.includes(file.type)) {
    return NextResponse.json(
      {
        error: `Formato no soportado: ${file.type}. Usá PDF, JPG, PNG o WebP.`,
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'El archivo no puede superar 20 MB' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  let textoRespuesta: string;
  try {
    textoRespuesta = await llamarGemini(PROMPT_EXTRACCION_PRECIOS, {
      base64,
      mimeType: file.type,
    });
  } catch (err) {
    const e = err as GeminiError | Error;
    if (e instanceof GeminiError && (e.code === 'api_key' || e.code === 'config')) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    if (e instanceof GeminiError && e.code === 'timeout') {
      return NextResponse.json({ error: e.message }, { status: 504 });
    }
    return NextResponse.json(
      { error: `Error al procesar con IA: ${e.message}` },
      { status: 502 },
    );
  }

  let resultado: GeminiResult;
  try {
    resultado = JSON.parse(textoRespuesta) as GeminiResult;
  } catch {
    const jsonMatch = textoRespuesta.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        resultado = JSON.parse(jsonMatch[0]) as GeminiResult;
      } catch {
        return NextResponse.json(
          {
            error: 'La IA no devolvió un JSON válido. Intentá con otra imagen o PDF.',
            respuesta_raw: textoRespuesta.substring(0, 500),
          },
          { status: 422 },
        );
      }
    } else {
      return NextResponse.json(
        {
          error: 'La IA no devolvió un JSON válido.',
          respuesta_raw: textoRespuesta.substring(0, 500),
        },
        { status: 422 },
      );
    }
  }

  if (!resultado.productos || !Array.isArray(resultado.productos)) {
    return NextResponse.json(
      { error: 'La respuesta no contiene un array de productos' },
      { status: 422 },
    );
  }

  const productosNormalizados = resultado.productos
    .filter((p) => p.nombre && typeof p.nombre === 'string' && p.nombre.trim() !== '')
    .map((p, i) => ({
      codigo: p.codigo != null ? String(p.codigo).trim() || null : null,
      nombre: String(p.nombre).trim(),
      precio_venta: typeof p.precio === 'number' && p.precio >= 0 ? p.precio : null,
      precio_costo: null as number | null,
      stock_actual: null as number | null,
      unidad: p.unidad != null ? String(p.unidad).trim() || null : null,
      categoria: null as string | null,
      _indice_original: i,
    }));

  const { error: logInsertErr } = await supabase.from('importacion_log').insert({
    tenant_id: tenantId,
    proveedor_id: null,
    archivo_nombre: `[IA extracción] ${file.name}`,
    origen: 'ia_pdf',
    total_filas: 0,
    filas_exitosas: 0,
    filas_con_error: 0,
    productos_creados: 0,
    productos_actualizados: 0,
    detalle_errores: null,
    usuario_id: userId,
  });
  if (logInsertErr) {
    console.error('[IA extraer] importacion_log:', logInsertErr.message);
  }

  return NextResponse.json({
    productos: productosNormalizados,
    total_extraidos: resultado.productos.length,
    total_validos: productosNormalizados.length,
    archivo_nombre: file.name,
  });
}
