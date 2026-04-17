import { NextResponse } from 'next/server';

import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';

const selectPedido = `
  *,
  cliente:cliente_id(nombre, razon_social, cuit_dni, condicion_iva, direccion),
  usuario:usuario_id(nombre, apellido),
  items:pedido_item(id, cantidad, precio_unitario, subtotal, producto:producto_id(id, nombre, codigo))
`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await moduloGuard('pedidos');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { id } = await params;

  const { data: pedido, error } = await session.supabase
    .from('pedido')
    .select(selectPedido)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  return NextResponse.json(pedido);
}
