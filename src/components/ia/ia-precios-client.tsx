'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDashboardRole } from '@/components/dashboard/dashboard-role-context';
import { ExtraerPrecios } from '@/components/ia/extraer-precios';
import { PrecioCambioPreview, type CambioPrecio } from '@/components/ia/precio-cambio-preview';
import { PreviewTable, type SugerenciaVentaFila } from '@/components/importar/preview-table';
import { writeImportResult } from '@/lib/importar/draft';
import { MAPEO_IA_PREVIEW } from '@/lib/ia/mapeo-preview';
import { type CampoProducto } from '@/lib/normalizador/aliases';
import { deduplicarFilas } from '@/lib/normalizador/deduplicar';
import { validarFilas, type FilaValidada } from '@/lib/normalizador/validar';

type FilaApi = {
  codigo: string | null;
  nombre: string;
  precio_costo?: number | null;
  precio_venta?: number | null;
  stock_actual?: number | null;
  stock_minimo?: number | null;
  categoria?: string | null;
  unidad?: string | null;
  fecha_vencimiento?: string | null;
};

function filaValidadaToPayload(f: FilaValidada): FilaApi {
  const d = f.datos;
  return {
    codigo: d.codigo != null ? String(d.codigo) : null,
    nombre: String(d.nombre ?? ''),
    precio_costo: d.precio_costo as number | null | undefined,
    precio_venta: d.precio_venta as number | null | undefined,
    stock_actual: d.stock_actual as number | null | undefined,
    stock_minimo: d.stock_minimo as number | null | undefined,
    categoria: d.categoria != null ? String(d.categoria) : null,
    unidad: d.unidad != null ? String(d.unidad) : null,
    fecha_vencimiento: d.fecha_vencimiento != null ? String(d.fecha_vencimiento) : null,
  };
}

export function IaPreciosClient() {
  const router = useRouter();
  const { canEdit } = useDashboardRole();
  const [step, setStep] = useState<'carga' | 'preview'>('carga');
  const [filasRaw, setFilasRaw] = useState<Record<string, string | number | null>[] | null>(null);
  const [archivoNombre, setArchivoNombre] = useState('');
  const [loadingEjec, setLoadingEjec] = useState(false);
  const [cambios, setCambios] = useState<CambioPrecio[]>([]);
  const [sugerencias, setSugerencias] = useState<(SugerenciaVentaFila | null)[]>([]);
  const [limite, setLimite] = useState<{ usadas: number; limite: number; permitido: boolean } | null>(
    null,
  );

  const refreshLimite = useCallback(async () => {
    try {
      const res = await fetch('/api/ia/limite');
      const j = (await res.json()) as {
        usadas?: number;
        limite?: number;
        permitido?: boolean;
      };
      if (res.ok) {
        setLimite({
          usadas: j.usadas ?? 0,
          limite: j.limite ?? 50,
          permitido: j.permitido ?? true,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshLimite();
  }, [refreshLimite]);

  const camposActivos = useMemo((): CampoProducto[] => {
    const s = new Set<CampoProducto>();
    for (const c of MAPEO_IA_PREVIEW) {
      if (!c.ignorar && c.campoDetectado) s.add(c.campoDetectado);
    }
    return Array.from(s);
  }, []);

  const filasValidadas = useMemo(() => {
    if (!filasRaw) return [];
    return validarFilas(filasRaw, MAPEO_IA_PREVIEW);
  }, [filasRaw]);

  useEffect(() => {
    if (step !== 'preview' || !filasRaw?.length) return;

    const payload = filasValidadas.map((f) => ({
      codigo: f.datos.codigo != null ? String(f.datos.codigo).trim() : null,
      nombre: String(f.datos.nombre ?? ''),
      precio_venta: typeof f.datos.precio_venta === 'number' ? f.datos.precio_venta : null,
      precio_costo: typeof f.datos.precio_costo === 'number' ? f.datos.precio_costo : null,
    }));

    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch('/api/ia/previsualizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filas: payload }),
          });
          const j = (await res.json()) as {
            cambios?: CambioPrecio[];
            sugerencias?: (SugerenciaVentaFila | null)[];
            error?: string;
          };
          if (res.ok) {
            setCambios(j.cambios ?? []);
            setSugerencias(j.sugerencias ?? []);
          } else {
            setCambios([]);
            setSugerencias([]);
          }
        } catch {
          setCambios([]);
          setSugerencias([]);
        }
      })();
    }, 350);

    return () => clearTimeout(t);
  }, [filasValidadas, filasRaw, step]);

  const onExtraccionCompleta = useCallback(
    (
      productos: {
        codigo: string | null;
        nombre: string;
        precio_venta: number | null;
        precio_costo: number | null;
        unidad: string | null;
      }[],
      name: string,
    ) => {
      setArchivoNombre(name);
      setFilasRaw(
        productos.map((p) => ({
          codigo: p.codigo ?? '',
          nombre: p.nombre,
          precio_venta: p.precio_venta ?? '',
          precio_costo: p.precio_costo ?? '',
          unidad: p.unidad ?? '',
        })),
      );
      setStep('preview');
    },
    [],
  );

  const onFilaEdit = useCallback(
    (index: number, campo: CampoProducto, valor: string | number | null) => {
      setFilasRaw((prev) => {
        if (!prev) return prev;
        const col = MAPEO_IA_PREVIEW.find((m) => m.campoDetectado === campo && !m.ignorar);
        if (!col) return prev;
        return prev.map((row, i) => (i === index ? { ...row, [col.headerOriginal]: valor } : row));
      });
    },
    [],
  );

  const onFilaDescartar = useCallback((index: number) => {
    setFilasRaw((prev) => (prev ? prev.filter((_, i) => i !== index) : null));
  }, []);

  const ejecutarImportacion = useCallback(async () => {
    if (!canEdit || !filasRaw) return;
    const validas = filasValidadas.filter((f) => f.valida);
    const { unicas, duplicadasDescartadas } = deduplicarFilas(validas);
    const filas = unicas.map(filaValidadaToPayload);

    setLoadingEjec(true);
    try {
      const res = await fetch('/api/importar/ejecutar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filas,
          proveedor_id: null,
          archivo_nombre: archivoNombre,
          origen: 'ia_pdf',
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        total_filas?: number;
        productos_creados?: number;
        productos_actualizados?: number;
        filas_con_error?: number;
        detalle_errores?: { fila: number; campo: string; error: string; valor_original?: string }[];
      };

      if (!res.ok) {
        throw new Error(json.error ?? 'Error al importar');
      }

      writeImportResult({
        total_filas: json.total_filas ?? filas.length,
        productos_creados: json.productos_creados ?? 0,
        productos_actualizados: json.productos_actualizados ?? 0,
        filas_con_error: json.filas_con_error ?? 0,
        detalle_errores: (json.detalle_errores ?? []).map((e) => ({
          fila: e.fila,
          campo: e.campo,
          error: e.error,
        })),
        duplicadas_descartadas: duplicadasDescartadas,
        archivo_nombre: archivoNombre,
      });
      setStep('carga');
      setFilasRaw(null);
      setArchivoNombre('');
      void refreshLimite();
      router.push('/importar/resumen');
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    } finally {
      setLoadingEjec(false);
    }
  }, [canEdit, filasRaw, filasValidadas, archivoNombre, router, refreshLimite]);

  const quedan = limite != null ? limite.limite - limite.usadas : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">IA de precios</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Extracción con Gemini y mismo flujo de preview que el importador Excel.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm">
          <Link
            href="/ia-precios/historial"
            className="text-purple-700 underline underline-offset-4 hover:text-purple-900"
          >
            Historial de precios
          </Link>
          {limite ? (
            <div
              className={`rounded-md border px-3 py-2 text-right ${
                quedan != null && quedan < 5
                  ? 'border-amber-300 bg-amber-50 text-amber-950'
                  : 'border-border bg-muted/40 text-muted-foreground'
              }`}
            >
              <span className="font-medium text-foreground">
                {limite.usadas}/{limite.limite}
              </span>{' '}
              extracciones usadas este mes
              {quedan != null && quedan < 5 && quedan >= 0 ? (
                <p className="mt-1 text-xs">Quedan pocas extracciones disponibles.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {step === 'carga' ? (
        <ExtraerPrecios
          onExtraccionCompleta={onExtraccionCompleta}
          onLimiteRefresh={refreshLimite}
          disabled={limite != null && !limite.permitido}
        />
      ) : null}

      {step === 'preview' && filasRaw ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => {
                setStep('carga');
                setFilasRaw(null);
                setArchivoNombre('');
                setCambios([]);
                setSugerencias([]);
              }}
            >
              ← Nueva extracción
            </button>
            <span className="mx-2">·</span>
            <span className="text-foreground">{archivoNombre}</span>
          </p>

          {!canEdit ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Tu rol no permite ejecutar la importación.
            </p>
          ) : null}

          {cambios.length > 0 ? <PrecioCambioPreview cambios={cambios} /> : null}

          <PreviewTable
            filas={filasValidadas}
            camposActivos={camposActivos}
            onFilaEdit={onFilaEdit}
            onFilaDescartar={onFilaDescartar}
            onConfirmar={() => void ejecutarImportacion()}
            loading={loadingEjec || !canEdit}
            sugerenciasVentaPorFila={sugerencias}
          />
        </div>
      ) : null}
    </div>
  );
}
