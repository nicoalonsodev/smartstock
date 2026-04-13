import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const integrationConfigured = Boolean(supabaseUrl && anonKey && serviceRoleKey);

function decodeJwtPayload(accessToken: string): Record<string, unknown> {
  const part = accessToken.split('.')[1];
  const json = Buffer.from(part, 'base64url').toString('utf8');
  return JSON.parse(json) as Record<string, unknown>;
}

function userClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl!, anonKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

describe.skipIf(!integrationConfigured)('Aislamiento RLS — producto', () => {
  const adminClient = createClient<Database>(supabaseUrl!, serviceRoleKey!);

  const runId = crypto.randomUUID();
  const emailA = `rls-a-${runId}@smartstock-integration.test`;
  const emailB = `rls-b-${runId}@smartstock-integration.test`;
  const emailOrphan = `rls-orphan-${runId}@smartstock-integration.test`;
  const password = 'test-pass-rls-01';

  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;
  let orphanUserId: string;
  let productoAId: string;
  let tokenA: string;
  let tokenB: string;
  let tokenOrphan: string;

  beforeAll(async () => {
    const { data: tA, error: eA } = await adminClient
      .from('tenant')
      .insert({ nombre: `RLS Tenant A ${runId}`, plan: 'base' })
      .select('id')
      .single();
    if (eA || !tA) throw eA ?? new Error('No se creó tenant A');
    tenantAId = tA.id;

    const { data: tB, error: eB } = await adminClient
      .from('tenant')
      .insert({ nombre: `RLS Tenant B ${runId}`, plan: 'base' })
      .select('id')
      .single();
    if (eB || !tB) throw eB ?? new Error('No se creó tenant B');
    tenantBId = tB.id;

    for (const row of [
      { tenant_id: tenantAId },
      { tenant_id: tenantBId },
    ] as const) {
      const { error: mcErr } = await adminClient.from('modulo_config').insert({
        tenant_id: row.tenant_id,
        stock: true,
        importador_excel: true,
        facturador_simple: true,
        facturador_arca: false,
        pedidos: false,
        presupuestos: false,
        ia_precios: false,
      });
      if (mcErr) throw mcErr;
    }

    const { data: authA, error: authAErr } = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
    });
    if (authAErr || !authA.user) throw authAErr ?? new Error('auth A');
    userAId = authA.user.id;

    const { error: uAErr } = await adminClient.from('usuario').insert({
      id: userAId,
      tenant_id: tenantAId,
      nombre: 'User',
      apellido: 'A',
      email: emailA,
      rol: 'admin',
    });
    if (uAErr) throw uAErr;

    const { data: authB, error: authBErr } = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
    });
    if (authBErr || !authB.user) throw authBErr ?? new Error('auth B');
    userBId = authB.user.id;

    const { error: uBErr } = await adminClient.from('usuario').insert({
      id: userBId,
      tenant_id: tenantBId,
      nombre: 'User',
      apellido: 'B',
      email: emailB,
      rol: 'admin',
    });
    if (uBErr) throw uBErr;

    const { data: authO, error: authOErr } = await adminClient.auth.admin.createUser({
      email: emailOrphan,
      password,
      email_confirm: true,
    });
    if (authOErr || !authO.user) throw authOErr ?? new Error('auth orphan');
    orphanUserId = authO.user.id;

    const signInA = createClient<Database>(supabaseUrl!, anonKey!);
    const { data: sessionA, error: sAErr } = await signInA.auth.signInWithPassword({
      email: emailA,
      password,
    });
    if (sAErr || !sessionA.session) throw sAErr ?? new Error('session A');
    tokenA = sessionA.session.access_token;

    const signInB = createClient<Database>(supabaseUrl!, anonKey!);
    const { data: sessionB, error: sBErr } = await signInB.auth.signInWithPassword({
      email: emailB,
      password,
    });
    if (sBErr || !sessionB.session) throw sBErr ?? new Error('session B');
    tokenB = sessionB.session.access_token;

    const signInO = createClient<Database>(supabaseUrl!, anonKey!);
    const { data: sessionO, error: sOErr } = await signInO.auth.signInWithPassword({
      email: emailOrphan,
      password,
    });
    if (sOErr || !sessionO.session) throw sOErr ?? new Error('session orphan');
    tokenOrphan = sessionO.session.access_token;

    const codigo = `RLS-${runId.slice(0, 8)}`;
    const { data: prod, error: pErr } = await adminClient
      .from('producto')
      .insert({
        tenant_id: tenantAId,
        codigo,
        nombre: 'Producto secreto de A',
        precio_costo: 100,
        precio_venta: 150,
        unidad: 'unidad',
        stock_actual: 0,
        stock_minimo: 0,
        activo: true,
      })
      .select('id')
      .single();
    if (pErr || !prod) throw pErr ?? new Error('producto');
    productoAId = prod.id;
  }, 120_000);

  afterAll(async () => {
    try {
      if (tenantAId) await adminClient.from('tenant').delete().eq('id', tenantAId);
      if (tenantBId) await adminClient.from('tenant').delete().eq('id', tenantBId);
    } catch {
      /* limpieza best-effort */
    }
    try {
      if (userAId) await adminClient.auth.admin.deleteUser(userAId);
      if (userBId) await adminClient.auth.admin.deleteUser(userBId);
      if (orphanUserId) await adminClient.auth.admin.deleteUser(orphanUserId);
    } catch {
      /* limpieza best-effort */
    }
  });

  it('Tenant A puede SELECT sus propios productos', async () => {
    const client = userClient(tokenA);
    const { data, error } = await client.from('producto').select('*');
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].nombre).toBe('Producto secreto de A');
  });

  it('Tenant B no puede ver productos de Tenant A', async () => {
    const client = userClient(tokenB);
    const { data, error } = await client.from('producto').select('*');
    expect(error).toBeNull();
    expect(data?.length ?? 0).toBe(0);
  });

  it('Tenant B no puede UPDATE productos de Tenant A', async () => {
    const client = userClient(tokenB);
    const { data, error } = await client
      .from('producto')
      .update({ nombre: 'Hackeado' })
      .eq('id', productoAId)
      .select();
    expect(error).toBeNull();
    expect(data?.length ?? 0).toBe(0);
  });

  it('Tenant B no puede DELETE productos de Tenant A', async () => {
    const client = userClient(tokenB);
    const { data, error } = await client.from('producto').delete().eq('id', productoAId).select();
    expect(error).toBeNull();
    expect(data?.length ?? 0).toBe(0);
  });

  it('Tenant B no puede INSERT con tenant_id de Tenant A', async () => {
    const client = userClient(tokenB);
    const { data, error } = await client
      .from('producto')
      .insert({
        tenant_id: tenantAId,
        codigo: `HACK-${runId.slice(0, 8)}`,
        nombre: 'Producto intruso',
        precio_costo: 1,
        precio_venta: 2,
        unidad: 'unidad',
        stock_actual: 0,
        stock_minimo: 0,
        activo: true,
      })
      .select();
    expect(error).not.toBeNull();
    expect(data == null || data.length === 0).toBe(true);
  });

  it('usuario sin fila en usuario / sin tenant_id en JWT no ve productos', async () => {
    const claims = decodeJwtPayload(tokenOrphan);
    expect(claims.tenant_id == null || claims.tenant_id === '').toBe(true);

    const client = userClient(tokenOrphan);
    const { data, error } = await client.from('producto').select('*');
    expect(error).toBeNull();
    expect(data?.length ?? 0).toBe(0);
  });
});

describe('Aislamiento RLS — prerequisitos', () => {
  it('si faltan variables de Supabase, la suite de integración se omite', () => {
    if (integrationConfigured) {
      expect(supabaseUrl).toBeTruthy();
      expect(anonKey).toBeTruthy();
      expect(serviceRoleKey).toBeTruthy();
    } else {
      expect(integrationConfigured).toBe(false);
    }
  });
});
