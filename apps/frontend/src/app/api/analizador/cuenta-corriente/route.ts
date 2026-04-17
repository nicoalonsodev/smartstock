import { NextResponse } from 'next/server';

import { getTenantSession } from '@/lib/api/tenant-session';

export async function GET(request: Request) {
  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const url = new URL(request.url);
  const clienteId = url.searchParams.get('cliente_id');

  if (!clienteId) {
    return NextResponse.json({ error: 'cliente_id requerido' }, { status: 400 });
  }

  try {
    // Get cuenta corriente
    const { data: cuenta } = await session.supabase
      .from('cuenta_corriente')
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    // Get pagos
    const { data: pagos } = await session.supabase
      .from('pago')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false })
      .limit(50);

    // Get related comprobantes for context
    const { data: comprobantes } = await session.supabase
      .from('comprobante')
      .select('id, tipo, numero, total, fecha, estado')
      .eq('cliente_id', clienteId)
      .eq('estado', 'emitido')
      .order('fecha', { ascending: false })
      .limit(20);

    return NextResponse.json({
      cuenta: cuenta ?? null,
      pagos: pagos ?? [],
      comprobantes: comprobantes ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
