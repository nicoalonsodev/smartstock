import { NextResponse } from 'next/server';

import {
  crearListaConItems,
  extraerItemsExcel,
  extraerItemsIA,
  GeminiError,
  LimiteIAError,
  subirArchivoStorage,
} from '@/lib/analizador/extraer-lista';
import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

const MIME_EXCEL = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

const MIME_IA = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MIME_TODOS = [...MIME_EXCEL, ...MIME_IA];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

// ---------------------------------------------------------------------------
// POST /api/analizador/listas — Upload + extract
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  const { supabase, tenantId, userId } = session;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Se esperaba multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('archivo') as File | null;
  const proveedorId = formData.get('proveedor_id') as string | null;
  const fechaDesde = formData.get('fecha_vigencia_desde') as string | null;
  const fechaHasta = formData.get('fecha_vigencia_hasta') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
  }
  if (!proveedorId) {
    return NextResponse.json({ error: 'proveedor_id es obligatorio' }, { status: 400 });
  }

  const mimeType = file.type || 'application/octet-stream';

  if (!MIME_TODOS.includes(mimeType)) {
    return NextResponse.json(
      { error: `Formato no soportado: ${mimeType}. Usá PDF, Excel, CSV, JPG, PNG o WebP.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'El archivo no puede superar 20 MB' }, { status: 400 });
  }

  const { data: proveedor } = await supabase
    .from('proveedor')
    .select('id')
    .eq('id', proveedorId)
    .maybeSingle();

  if (!proveedor) {
    return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const esExcel = MIME_EXCEL.includes(mimeType);

  let items;
  let iaUsada = false;

  try {
    if (esExcel) {
      items = extraerItemsExcel(arrayBuffer, file.name);
    } else {
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      items = await extraerItemsIA(base64, mimeType, supabase, { tenantId, userId }, file.name);
      iaUsada = true;
    }
  } catch (err) {
    if (err instanceof LimiteIAError) {
      return NextResponse.json(
        { error: err.message, usadas: err.usadas, limite: err.limite },
        { status: 429 },
      );
    }
    if (err instanceof GeminiError) {
      if (err.code === 'api_key' || err.code === 'config') {
        return NextResponse.json({ error: err.message }, { status: 503 });
      }
      if (err.code === 'timeout') {
        return NextResponse.json({ error: err.message }, { status: 504 });
      }
      return NextResponse.json({ error: `Error de IA: ${err.message}` }, { status: 502 });
    }
    return NextResponse.json(
      { error: (err as Error).message || 'Error al extraer items' },
      { status: 422 },
    );
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: 'No se pudo extraer ningún item válido del archivo' },
      { status: 422 },
    );
  }

  const storagePath = await subirArchivoStorage(supabase, tenantId, arrayBuffer, file.name, mimeType);

  let lista;
  try {
    lista = await crearListaConItems(supabase, {
      tenantId,
      userId,
      proveedorId,
      nombreArchivo: file.name,
      mimeType,
      items,
      origen: esExcel ? 'importacion_excel' : 'ia_pdf',
      storagePath,
      fechaVigenciaDesde: fechaDesde,
      fechaVigenciaHasta: fechaHasta,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Error al guardar la lista' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      lista,
      total_items: items.length,
      ia_usada: iaUsada,
    },
    { status: 201 },
  );
}

// ---------------------------------------------------------------------------
// GET /api/analizador/listas — List all listas
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const url = new URL(request.url);
  const proveedorId = url.searchParams.get('proveedor_id');
  const estado = url.searchParams.get('estado');

  let query = session.supabase
    .from('lista_precios')
    .select('*, proveedor:proveedor_id(id, nombre)')
    .order('fecha_recepcion', { ascending: false });

  if (proveedorId) {
    query = query.eq('proveedor_id', proveedorId);
  }
  if (estado) {
    query = query.eq('estado', estado as never);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listas: data ?? [] });
}
