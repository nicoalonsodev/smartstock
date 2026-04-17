import { NextResponse } from 'next/server';

import { getTenantSession } from '@/lib/api/tenant-session';
import { moduloGuard } from '@/lib/modulos/guard';
import { parseBarcode } from '@/lib/pos/barcode-parser';

export async function GET(request: Request) {
  const guard = await moduloGuard('facturador_pos');
  if (!guard.allowed) return guard.response;

  const session = await getTenantSession();
  if ('error' in session) return session.error;

  const { supabase, tenantId } = session;

  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get('codigo')?.trim();

  if (!codigo) {
    return NextResponse.json({ error: 'Falta el parámetro "codigo"' }, { status: 400 });
  }

  const parsed = parseBarcode(codigo);

  if (parsed.tipo === 'desconocido') {
    return NextResponse.json(
      { error: 'Producto no encontrado', codigo },
      { status: 404 },
    );
  }

  if (parsed.tipo === 'balanza_peso') {
    const { data: producto } = await supabase
      .from('producto')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('plu', parsed.codigoLookup)
      .eq('es_pesable', true)
      .eq('activo', true)
      .maybeSingle();

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado', codigo },
        { status: 404 },
      );
    }

    return NextResponse.json({
      producto,
      tipo: parsed.tipo,
      peso: parsed.pesoKg,
    });
  }

  // ean_normal: first try by codigo_barras, then by codigo (SKU)
  const { data: byBarcode } = await supabase
    .from('producto')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('codigo_barras', parsed.codigoLookup)
    .eq('activo', true)
    .maybeSingle();

  if (byBarcode) {
    return NextResponse.json({
      producto: byBarcode,
      tipo: parsed.tipo,
    });
  }

  const { data: bySku } = await supabase
    .from('producto')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('codigo', parsed.codigoLookup)
    .eq('activo', true)
    .maybeSingle();

  if (bySku) {
    return NextResponse.json({
      producto: bySku,
      tipo: parsed.tipo,
    });
  }

  // Fallback: try by PLU (codigo de balanza)
  const { data: byPlu } = await supabase
    .from('producto')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('plu', parsed.codigoLookup)
    .eq('activo', true)
    .maybeSingle();

  if (byPlu) {
    return NextResponse.json({
      producto: byPlu,
      tipo: parsed.tipo,
    });
  }

  return NextResponse.json(
    { error: 'Producto no encontrado', codigo },
    { status: 404 },
  );
}
