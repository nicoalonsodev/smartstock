import { NextResponse } from 'next/server';

import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await moduloGuard('facturador_simple');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { id } = await params;

  const { data, error } = await session.supabase
    .from('comprobante')
    .select(
      '*, cliente:cliente_id(nombre, razon_social, cuit_dni, condicion_iva), usuario:usuario_id(nombre, apellido), items:comprobante_item(id, cantidad, precio_unitario, subtotal, producto:producto_id(nombre, codigo))',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: 'Comprobante no encontrado' },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}
