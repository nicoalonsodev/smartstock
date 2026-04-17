import { NextResponse } from 'next/server';

import { compararProveedores } from '@/lib/analizador/comparar-proveedores';
import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET(request: Request) {
  const guard = await moduloGuard('analizador_rentabilidad');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const url = new URL(request.url);
  const productoId = url.searchParams.get('producto_id') ?? undefined;
  const categoriaId = url.searchParams.get('categoria_id') ?? undefined;

  try {
    const scores = await compararProveedores(session.supabase, productoId, categoriaId);
    return NextResponse.json({ proveedores: scores });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
