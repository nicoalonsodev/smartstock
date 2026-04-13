import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  ejecutarImportacionFilas,
  type FilaImportacion,
} from '@/lib/importar/ejecutar-importacion';
import { deduplicarFilas } from '@/lib/normalizador/deduplicar';
import { mapearHeaders } from '@/lib/normalizador/mapear';
import { validarFilas, type FilaValidada } from '@/lib/normalizador/validar';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const integrationConfigured = Boolean(supabaseUrl && anonKey && serviceRoleKey);

function userClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl!, anonKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function bufferAXlsxParseado(buf: Buffer): {
  headers: string[];
  filas: Record<string, string | number | null>[];
} {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('sin hoja');
  const sheet = wb.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });
  if (jsonData.length === 0) throw new Error('sin filas');
  const headers = Object.keys(jsonData[0]).filter((h) => h != null && String(h).trim() !== '');
  const filas = jsonData.map((row) => {
    const fila: Record<string, string | number | null> = {};
    for (const key of headers) {
      const val = row[key];
      fila[key] = val === undefined || val === '' ? null : (val as string | number);
    }
    return fila;
  });
  return { headers, filas };
}

function filasValidadasAImportacion(validadas: FilaValidada[]): FilaImportacion[] {
  return validadas.map((v) => {
    const d = v.datos;
    return {
      codigo: d.codigo != null ? String(d.codigo) : null,
      nombre: String(d.nombre ?? ''),
      precio_costo: typeof d.precio_costo === 'number' ? d.precio_costo : undefined,
      precio_venta: typeof d.precio_venta === 'number' ? d.precio_venta : undefined,
      stock_actual: typeof d.stock_actual === 'number' ? d.stock_actual : undefined,
      stock_minimo: typeof d.stock_minimo === 'number' ? d.stock_minimo : undefined,
      categoria: typeof d.categoria === 'string' ? d.categoria : undefined,
      unidad: typeof d.unidad === 'string' ? d.unidad : undefined,
      fecha_vencimiento: typeof d.fecha_vencimiento === 'string' ? d.fecha_vencimiento : undefined,
    };
  });
}

describe.skipIf(!integrationConfigured)('Integración — importador (Supabase)', () => {
  const admin = createClient<Database>(supabaseUrl!, serviceRoleKey!);

  const runId = crypto.randomUUID().slice(0, 8);
  const email = `imp-int-${runId}@smartstock-integration.test`;
  const password = 'test-pass-imp-01';

  let tenantId: string;
  let userId: string;
  let token: string;

  beforeAll(async () => {
    const { data: t, error: te } = await admin
      .from('tenant')
      .insert({ nombre: `IMP Int ${runId}`, plan: 'base' })
      .select('id')
      .single();
    if (te || !t) throw te ?? new Error('tenant');
    tenantId = t.id;

    const { error: mcErr } = await admin.from('modulo_config').insert({
      tenant_id: tenantId,
      stock: true,
      importador_excel: true,
      facturador_simple: true,
      facturador_arca: false,
      pedidos: false,
      presupuestos: false,
      ia_precios: false,
    });
    if (mcErr) throw mcErr;

    const { data: auth, error: ae } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (ae || !auth.user) throw ae ?? new Error('auth');
    userId = auth.user.id;

    const { error: ue } = await admin.from('usuario').insert({
      id: userId,
      tenant_id: tenantId,
      nombre: 'Test',
      apellido: 'Import',
      email,
      rol: 'admin',
    });
    if (ue) throw ue;

    const signIn = createClient<Database>(supabaseUrl!, anonKey!);
    const { data: sess, error: se } = await signIn.auth.signInWithPassword({ email, password });
    if (se || !sess.session) throw se ?? new Error('session');
    token = sess.session.access_token;
  }, 120_000);

  afterAll(async () => {
    try {
      if (tenantId) await admin.from('tenant').delete().eq('id', tenantId);
    } catch {
      /* best-effort */
    }
    try {
      if (userId) await admin.auth.admin.deleteUser(userId);
    } catch {
      /* best-effort */
    }
  });

  it('upsert: crea producto y luego actualiza por mismo código', async () => {
    const sb = userClient(token);
    const codigo = `IMP-${runId}-U1`;

    const r1 = await ejecutarImportacionFilas(
      sb,
      { tenantId, userId },
      {
        filas: [
          {
            codigo,
            nombre: 'Uno',
            precio_costo: 10,
            precio_venta: 15,
            stock_actual: 5,
          },
        ],
        proveedor_id: null,
        archivo_nombre: 't1.xlsx',
        origen: 'importacion_excel',
      },
    );

    expect(r1.productos_creados).toBe(1);
    expect(r1.productos_actualizados).toBe(0);

    const r2 = await ejecutarImportacionFilas(
      sb,
      { tenantId, userId },
      {
        filas: [
          {
            codigo,
            nombre: 'Uno actualizado',
            precio_costo: 12,
            precio_venta: 18,
            stock_actual: 5,
          },
        ],
        proveedor_id: null,
        archivo_nombre: 't2.xlsx',
        origen: 'importacion_excel',
      },
    );

    expect(r2.productos_creados).toBe(0);
    expect(r2.productos_actualizados).toBe(1);

    const { data: prod } = await sb
      .from('producto')
      .select('nombre, precio_costo, precio_venta')
      .eq('codigo', codigo)
      .single();

    expect(prod?.nombre).toBe('Uno actualizado');
    expect(prod?.precio_costo).toBe(12);
    expect(prod?.precio_venta).toBe(18);
  });

  it('precio_historial se registra cuando cambia un precio', async () => {
    const sb = userClient(token);
    const codigo = `IMP-${runId}-HIST`;

    await ejecutarImportacionFilas(sb, { tenantId, userId }, {
      filas: [{ codigo, nombre: 'Hist', precio_venta: 50, precio_costo: 30 }],
      proveedor_id: null,
      archivo_nombre: 'h1.xlsx',
      origen: 'importacion_excel',
    });

    const { data: p0 } = await sb.from('producto').select('id').eq('codigo', codigo).single();
    const pid = p0!.id;

    await ejecutarImportacionFilas(sb, { tenantId, userId }, {
      filas: [{ codigo, nombre: 'Hist', precio_venta: 99, precio_costo: 30 }],
      proveedor_id: null,
      archivo_nombre: 'h2.xlsx',
      origen: 'importacion_excel',
    });

    const { data: hist } = await sb
      .from('precio_historial')
      .select('precio_venta_anterior, precio_venta_nuevo')
      .eq('producto_id', pid)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(hist?.length).toBeGreaterThan(0);
    expect(hist![0].precio_venta_anterior).toBe(50);
    expect(hist![0].precio_venta_nuevo).toBe(99);
  });

  it('importacion_log refleja métricas correctas', async () => {
    const sb = userClient(token);

    await ejecutarImportacionFilas(sb, { tenantId, userId }, {
      filas: [
        { codigo: `L-${runId}-a`, nombre: 'A', precio_venta: 1 },
        { codigo: `L-${runId}-b`, nombre: 'B', precio_venta: 2 },
        { codigo: '', nombre: '', precio_venta: 1 },
      ],
      proveedor_id: null,
      archivo_nombre: 'log-test.xlsx',
      origen: 'importacion_excel',
    });

    const { data: logs } = await sb
      .from('importacion_log')
      .select('*')
      .eq('archivo_nombre', 'log-test.xlsx')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(logs?.length).toBe(1);
    const log = logs![0];
    expect(log.total_filas).toBe(3);
    expect(log.filas_exitosas).toBe(2);
    expect(log.filas_con_error).toBe(1);
    expect(log.productos_creados).toBe(2);
  });

  it('pipeline XLSX generado con SheetJS: COD ART + PVP + deduplicación', async () => {
    const wb = XLSX.utils.book_new();
    const aoa = [
      ['COD ART', 'Nombre', 'PVP'],
      ['Z1', 'Primera', '$100,00'],
      ['Z1', 'Ultima', '$200,00'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    const buf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

    const { headers, filas } = bufferAXlsxParseado(buf);
    const mapeo = mapearHeaders(headers);
    const validadas = validarFilas(filas, mapeo);
    expect(validadas.every((v) => v.valida)).toBe(true);

    const { unicas, duplicadasDescartadas } = deduplicarFilas(validadas);
    expect(duplicadasDescartadas).toBe(1);
    expect(unicas[0].datos.precio_venta).toBe(200);

    const sb = userClient(token);
    const filasImp = filasValidadasAImportacion(unicas);
    const res = await ejecutarImportacionFilas(sb, { tenantId, userId }, {
      filas: filasImp,
      proveedor_id: null,
      archivo_nombre: 'sheetjs-pipeline.xlsx',
      origen: 'importacion_excel',
    });

    expect(res.productos_creados).toBe(1);
    const { data: prod } = await sb.from('producto').select('nombre, precio_venta').eq('codigo', 'Z1').single();
    expect(prod?.nombre).toBe('Ultima');
    expect(prod?.precio_venta).toBe(200);
  });
});
