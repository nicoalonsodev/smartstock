'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Ambiente = 'homologacion' | 'produccion';

interface ArcaConfig {
  cuit_emisor: string | null;
  punto_de_venta: number | null;
  ambiente: Ambiente;
  tiene_certificado: boolean;
  tiene_clave: boolean;
  updated_at: string;
}

export function ArcaConfigForm() {
  const [config, setConfig] = useState<ArcaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [syncResult, setSyncResult] = useState<Record<string, { arca: number; local: number; discrepancia: boolean }> | null>(null);
  const [certStatus, setCertStatus] = useState<{
    configurado: boolean;
    valido?: boolean;
    diasRestantes?: number;
    fechaVencimiento?: string;
    alerta?: boolean;
    critico?: boolean;
    expirado?: boolean;
  } | null>(null);

  const [cuitEmisor, setCuitEmisor] = useState('');
  const [puntoDeVenta, setPuntoDeVenta] = useState('1');
  const [ambiente, setAmbiente] = useState<Ambiente>('homologacion');
  const certInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const cargarConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/facturacion/arca/config');
      if (!res.ok) return;
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        setCuitEmisor(data.config.cuit_emisor ?? '');
        setPuntoDeVenta(String(data.config.punto_de_venta ?? 1));
        setAmbiente(data.config.ambiente ?? 'homologacion');

        const certRes = await fetch('/api/facturacion/arca/cert-status');
        if (certRes.ok) {
          setCertStatus(await certRes.json());
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarConfig();
  }, [cargarConfig]);

  async function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/facturacion/arca/sync-numeracion', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error ?? 'Error al sincronizar' });
        return;
      }
      setSyncResult(data.resultados);
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión al sincronizar' });
    } finally {
      setSyncing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);

    const certFile = certInputRef.current?.files?.[0];
    const keyFile = keyInputRef.current?.files?.[0];

    if (!config && (!certFile || !keyFile)) {
      setMensaje({ tipo: 'error', texto: 'Subí el certificado (.pem) y la clave privada (.key)' });
      return;
    }

    if (!cuitEmisor.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingresá el CUIT del emisor' });
      return;
    }

    const pvNum = parseInt(puntoDeVenta);
    if (isNaN(pvNum) || pvNum < 1) {
      setMensaje({ tipo: 'error', texto: 'El punto de venta debe ser un número mayor a 0' });
      return;
    }

    setSaving(true);

    try {
      let certificadoPem = '';
      let clavePrivadaPem = '';

      if (certFile) {
        certificadoPem = await readFileAsText(certFile);
      }
      if (keyFile) {
        clavePrivadaPem = await readFileAsText(keyFile);
      }

      if (!certFile && config) {
        certificadoPem = '__KEEP_EXISTING__';
      }
      if (!keyFile && config) {
        clavePrivadaPem = '__KEEP_EXISTING__';
      }

      const res = await fetch('/api/facturacion/arca/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificado_pem: certificadoPem,
          clave_privada_pem: clavePrivadaPem,
          cuit_emisor: cuitEmisor.trim(),
          punto_de_venta: pvNum,
          ambiente,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error ?? 'Error al guardar' });
        return;
      }

      setMensaje({ tipo: 'ok', texto: 'Configuración guardada correctamente' });
      await cargarConfig();

      if (certInputRef.current) certInputRef.current.value = '';
      if (keyInputRef.current) keyInputRef.current.value = '';
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-muted-foreground text-sm">Cargando configuración...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {config && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Configuración ARCA activa. Última actualización:{' '}
          {new Date(config.updated_at).toLocaleDateString('es-AR')}
        </div>
      )}

      {certStatus?.expirado && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <strong>Certificado expirado.</strong> La emisión con ARCA está bloqueada.
          Subí un nuevo certificado para continuar.
        </div>
      )}

      {certStatus?.critico && !certStatus.expirado && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <strong>Certificado vence en {certStatus.diasRestantes} días</strong> (
          {new Date(certStatus.fechaVencimiento!).toLocaleDateString('es-AR')}).
          Renovalo urgente para evitar interrupciones en la facturación.
        </div>
      )}

      {certStatus?.alerta && !certStatus.critico && !certStatus.expirado && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          El certificado vence en <strong>{certStatus.diasRestantes} días</strong> (
          {new Date(certStatus.fechaVencimiento!).toLocaleDateString('es-AR')}).
          Planificá la renovación.
        </div>
      )}

      <div className="space-y-4 rounded-lg border p-4">
        <h2 className="font-medium">Certificado digital</h2>

        <div>
          <label htmlFor="cert" className="mb-1 block text-sm font-medium">
            Certificado (.pem)
            {config?.tiene_certificado && (
              <span className="ml-2 text-xs text-green-600">ya cargado</span>
            )}
          </label>
          <input
            ref={certInputRef}
            id="cert"
            type="file"
            accept=".pem,.crt,.cer"
            className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>

        <div>
          <label htmlFor="key" className="mb-1 block text-sm font-medium">
            Clave privada (.key / .pem)
            {config?.tiene_clave && (
              <span className="ml-2 text-xs text-green-600">ya cargada</span>
            )}
          </label>
          <input
            ref={keyInputRef}
            id="key"
            type="file"
            accept=".key,.pem"
            className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h2 className="font-medium">Datos fiscales</h2>

        <div>
          <label htmlFor="cuit" className="mb-1 block text-sm font-medium">
            CUIT del emisor
          </label>
          <input
            id="cuit"
            type="text"
            value={cuitEmisor}
            onChange={(e) => setCuitEmisor(e.target.value)}
            placeholder="20-12345678-9"
            className="w-full rounded-md border px-3 py-2 text-sm"
            maxLength={13}
          />
        </div>

        <div>
          <label htmlFor="pv" className="mb-1 block text-sm font-medium">
            Punto de venta
          </label>
          <input
            id="pv"
            type="number"
            value={puntoDeVenta}
            onChange={(e) => setPuntoDeVenta(e.target.value)}
            min={1}
            max={99999}
            className="w-32 rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="amb" className="mb-1 block text-sm font-medium">
            Ambiente
          </label>
          <select
            id="amb"
            value={ambiente}
            onChange={(e) => setAmbiente(e.target.value as Ambiente)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="homologacion">Homologación (testing)</option>
            <option value="produccion">Producción</option>
          </select>
          {ambiente === 'produccion' && (
            <p className="mt-1 text-xs text-amber-600">
              Los comprobantes emitidos en producción son reales y tienen validez fiscal.
            </p>
          )}
        </div>
      </div>

      {config && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Numeración ARCA</h2>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar numeración'}
            </button>
          </div>

          {syncResult && (
            <div className="space-y-2 text-sm">
              {Object.entries(syncResult).map(([tipo, r]) => (
                <div
                  key={tipo}
                  className={`flex justify-between rounded px-3 py-2 ${
                    r.discrepancia
                      ? 'border border-amber-200 bg-amber-50 text-amber-800'
                      : 'border border-green-200 bg-green-50 text-green-800'
                  }`}
                >
                  <span className="font-medium">{formatTipoLabel(tipo)}</span>
                  <span>
                    ARCA: #{r.arca} | Local: #{r.local}
                    {r.discrepancia && ' — Discrepancia'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mensaje && (
        <div
          className={`rounded-md p-3 text-sm ${
            mensaje.tipo === 'ok'
              ? 'border border-green-200 bg-green-50 text-green-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {saving ? 'Guardando...' : config ? 'Actualizar configuración' : 'Guardar configuración'}
      </button>
    </form>
  );
}

const TIPO_LABELS: Record<string, string> = {
  factura_a: 'Factura A',
  factura_b: 'Factura B',
  factura_c: 'Factura C',
};

function formatTipoLabel(tipo: string): string {
  return TIPO_LABELS[tipo] ?? tipo;
}
