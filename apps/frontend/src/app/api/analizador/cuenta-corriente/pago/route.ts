import { NextResponse } from 'next/server';

import { getTenantSession, rejectIfVisor } from '@/lib/api/tenant-session';

export async function POST(request: Request) {
  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const forbidden = rejectIfVisor(session.rol);
  if (forbidden) return forbidden;

  try {
    const body = await request.json();
    const { cliente_id, monto, tipo_pago, referencia, notas } = body as {
      cliente_id: string;
      monto: number;
      tipo_pago?: string;
      referencia?: string;
      notas?: string;
    };

    if (!cliente_id || !monto || monto <= 0) {
      return NextResponse.json(
        { error: 'cliente_id y monto (> 0) son requeridos' },
        { status: 400 },
      );
    }

    const { data, error } = await session.supabase.rpc('registrar_pago', {
      p_tenant_id: session.tenantId,
      p_cliente_id: cliente_id,
      p_monto: monto,
      p_tipo_pago: (tipo_pago as 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'otro') ?? 'efectivo',
      p_referencia: referencia ?? null,
      p_notas: notas ?? null,
      p_usuario_id: session.userId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pago: data });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
