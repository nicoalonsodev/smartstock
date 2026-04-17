/**
 * Tests de la cola de reintentos ARCA.
 * Mockea respuestas de ARCA para simular timeouts y errores.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { solicitarCAE, type ResultadoCAE } from '@/lib/facturacion/arca/wsfe';

vi.mock('@/lib/facturacion/arca/wsaa', () => ({
  asegurarTicketVigente: vi.fn().mockResolvedValue({
    token: 'mock-token',
    sign: 'mock-sign',
  }),
}));

vi.mock('@/lib/facturacion/arca/logger', () => ({
  logArcaOperacion: vi.fn().mockResolvedValue(undefined),
}));

const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;

function createMockSupabase() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: { ticket_acceso: 'tok', ticket_sign: 'sig', ticket_expiracion: new Date(Date.now() + 3600000).toISOString() } }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: () => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  } as never;
}

const baseConfig = {
  tenant_id: 'test-tenant-id',
  cuit_emisor: '20123456789',
  punto_de_venta: 1,
  ambiente: 'homologacion' as const,
};

const baseSolicitud = {
  tenantId: 'test-tenant-id',
  tipo: 'factura_b',
  numero: 1,
  fecha: '2026-04-16',
  clienteCuitDni: null,
  importeTotal: 121,
  importeNeto: 100,
  importeIVA: 21,
  alicuotaIVA: 21,
};

describe('Cola de reintentos ARCA', () => {
  beforeEach(() => {
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockFetch.mockReset();
  });

  it('comprobante pendiente_arca es procesado exitosamente', async () => {
    const caeResponse = `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <FECAESolicitarResponse>
            <FECAESolicitarResult>
              <FeCabResp><Resultado>A</Resultado></FeCabResp>
              <FeDetResp>
                <FECAEDetResponse>
                  <Resultado>A</Resultado>
                  <CAE>71234567890123</CAE>
                  <CAEFchVto>20260430</CAEFchVto>
                </FECAEDetResponse>
              </FeDetResp>
            </FECAESolicitarResult>
          </FECAESolicitarResponse>
        </soap:Body>
      </soap:Envelope>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(caeResponse),
    });

    const supabase = createMockSupabase();
    const resultado = await solicitarCAE(supabase, baseConfig, baseSolicitud, 'comp-id-1');

    expect(resultado.aprobado).toBe(true);
    expect(resultado.cae).toBe('71234567890123');
    expect(resultado.caeVencimiento).toBe('2026-04-30');
  });

  it('después de timeout/error de red, retorna como pendiente', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fetch failed: timeout'));

    const supabase = createMockSupabase();
    const resultado = await solicitarCAE(supabase, baseConfig, baseSolicitud, 'comp-id-2');

    expect(resultado.aprobado).toBe(false);
    expect(resultado.cae).toBeNull();
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0].codigo).toBe('NETWORK');
  });

  it('ARCA rechaza con errores descriptivos', async () => {
    const rejectResponse = `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <FECAESolicitarResponse>
            <FECAESolicitarResult>
              <FeCabResp><Resultado>R</Resultado></FeCabResp>
              <FeDetResp>
                <FECAEDetResponse>
                  <Resultado>R</Resultado>
                  <Observaciones>
                    <Obs><Code>10016</Code><Msg>El campo DocNro es requerido para tipo de documento 80</Msg></Obs>
                  </Observaciones>
                </FECAEDetResponse>
              </FeDetResp>
              <Errors>
                <Err><Code>10016</Code><Msg>El campo DocNro es requerido</Msg></Err>
              </Errors>
            </FECAESolicitarResult>
          </FECAESolicitarResponse>
        </soap:Body>
      </soap:Envelope>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(rejectResponse),
    });

    const supabase = createMockSupabase();
    const resultado = await solicitarCAE(supabase, baseConfig, baseSolicitud, 'comp-id-3');

    expect(resultado.aprobado).toBe(false);
    expect(resultado.cae).toBeNull();
    expect(resultado.errores.length).toBeGreaterThan(0);
    expect(resultado.errores[0].codigo).toBe('10016');
  });

  it('simula ciclo completo: 3 reintentos fallidos -> error_arca', async () => {
    const failResults: ResultadoCAE[] = [];

    for (let i = 0; i < 3; i++) {
      mockFetch.mockRejectedValueOnce(new Error('timeout'));
      const supabase = createMockSupabase();
      const resultado = await solicitarCAE(supabase, baseConfig, baseSolicitud, 'comp-id-4');
      failResults.push(resultado);
    }

    expect(failResults).toHaveLength(3);
    expect(failResults.every((r) => !r.aprobado)).toBe(true);
    expect(failResults.every((r) => r.errores[0]?.codigo === 'NETWORK')).toBe(true);
  });

  it('reintento exitoso actualiza CAE y estado', async () => {
    // First attempt fails
    mockFetch.mockRejectedValueOnce(new Error('timeout'));
    const supabase = createMockSupabase();
    const fail = await solicitarCAE(supabase, baseConfig, baseSolicitud, 'comp-id-5');
    expect(fail.aprobado).toBe(false);

    // Second attempt succeeds
    const successResponse = `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <FECAESolicitarResponse>
            <FECAESolicitarResult>
              <FeCabResp><Resultado>A</Resultado></FeCabResp>
              <FeDetResp>
                <FECAEDetResponse>
                  <Resultado>A</Resultado>
                  <CAE>71234567890999</CAE>
                  <CAEFchVto>20260430</CAEFchVto>
                </FECAEDetResponse>
              </FeDetResp>
            </FECAESolicitarResult>
          </FECAESolicitarResponse>
        </soap:Body>
      </soap:Envelope>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(successResponse),
    });

    const success = await solicitarCAE(supabase, baseConfig, baseSolicitud, 'comp-id-5');
    expect(success.aprobado).toBe(true);
    expect(success.cae).toBe('71234567890999');
  });
});
