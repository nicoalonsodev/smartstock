import { NextResponse } from 'next/server';

import { compararListas } from '@/lib/analizador/comparar-listas';
import { compararTemporal } from '@/lib/analizador/comparar-temporal';
import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

/**
 * GET — Comparación temporal: mismo proveedor en el tiempo.
 */
export async function GET(request: Request) {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const url = new URL(request.url);
  const proveedorId = url.searchParams.get('proveedor_id');

  if (!proveedorId) {
    return NextResponse.json({ error: 'proveedor_id es obligatorio' }, { status: 400 });
  }

  try {
    const resultado = await compararTemporal(session.supabase, proveedorId);
    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

/**
 * POST — Comparación de N listas de distintos proveedores.
 * Body: { lista_ids: string[] } (2 a 5 listas)
 */
export async function POST(request: Request) {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const visorCheck = rejectIfVisor(session.rol);
  if (visorCheck) return visorCheck;

  let body: { lista_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { lista_ids } = body;
  if (!Array.isArray(lista_ids) || lista_ids.length < 2 || lista_ids.length > 5) {
    return NextResponse.json(
      { error: 'Se requieren entre 2 y 5 lista_ids' },
      { status: 400 },
    );
  }

  try {
    const resultado = await compararListas(
      session.supabase,
      lista_ids,
      { tenantId: session.tenantId, userId: session.userId },
    );
    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
