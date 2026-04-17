'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDashboardRole } from '@/components/dashboard/dashboard-role-context';
import { PreviewTable } from '@/components/importar/preview-table';
import {
  clearImportDraft,
  readImportDraft,
  writeImportDraft,
  writeImportResult,
  type ImportDraftV1,
} from '@/lib/importar/draft';
import { type CampoProducto } from '@/lib/normalizador/aliases';
import { deduplicarFilas } from '@/lib/normalizador/deduplicar';
import type { MapeoColumna } from '@/lib/normalizador/mapear';
import { validarFilas, type FilaValidada } from '@/lib/normalizador/validar';

function generarHeaderSintetico(campo: CampoProducto): string {
  const r =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto.randomUUID() as string).replace(/-/g, '').slice(0, 10)
      : String(Math.random()).slice(2, 12);
  return `__ss_${campo}_${r}`;
}

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
  codigo_barras?: string | null;
  rubro?: string | null;
  subrubro?: string | null;
  iva_porcentaje?: number | null;
  porcentaje_ganancia?: number | null;
  ubicacion?: string | null;
  moneda?: string | null;
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
    codigo_barras: d.codigo_barras != null ? String(d.codigo_barras) : null,
    rubro: d.rubro != null ? String(d.rubro) : null,
    subrubro: d.subrubro != null ? String(d.subrubro) : null,
    iva_porcentaje: d.iva_porcentaje as number | null | undefined,
    porcentaje_ganancia: d.porcentaje_ganancia as number | null | undefined,
    ubicacion: d.ubicacion != null ? String(d.ubicacion) : null,
    moneda: d.moneda != null ? String(d.moneda) : null,
  };
}

export default function ImportarPreviewPage() {
  const router = useRouter();
  const { canEdit } = useDashboardRole();
  const [draft, setDraft] = useState<ImportDraftV1 | null>(null);
  const [filasRaw, setFilasRaw] = useState<Record<string, string | number | null>[] | null>(null);
  const [mapeo, setMapeo] = useState<MapeoColumna[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const d = readImportDraft();
    if (!d) {
      router.replace('/importar');
      return;
    }
    setDraft(d);
    setFilasRaw(d.archivo.filas);
    setMapeo(d.mapeo);
  }, [router]);

  const filasValidadas = useMemo(() => {
    if (!filasRaw || !mapeo) return [];
    return validarFilas(filasRaw, mapeo);
  }, [filasRaw, mapeo]);

  const columnasPreview = useMemo(
    () =>
      (mapeo ?? [])
        .filter((m) => !m.ignorar && m.campoDetectado)
        .map((m) => ({
          headerOriginal: m.headerOriginal,
          campo: m.campoDetectado!,
          sintetica: m.sintetica,
        })),
    [mapeo]
  );

  useEffect(() => {
    if (!draft || filasRaw === null || !mapeo) return;
    const d = readImportDraft();
    if (!d) return;
    const fileHeaders = d.archivo.headers.filter((h) => !String(h).startsWith('__ss_'));
    const syntheticHeaders = mapeo.filter((m) => m.sintetica).map((m) => m.headerOriginal);
    const headers = [...fileHeaders];
    for (const h of syntheticHeaders) {
      if (!headers.includes(h)) headers.push(h);
    }
    writeImportDraft({
      ...d,
      mapeo,
      archivo: {
        ...d.archivo,
        filas: filasRaw,
        headers,
      },
    });
  }, [draft, filasRaw, mapeo]);

  const onFilaEdit = useCallback((index: number, headerOriginal: string, valor: string | number | null) => {
    setFilasRaw((prev) => {
      if (!prev) return prev;
      return prev.map((row, i) => (i === index ? { ...row, [headerOriginal]: valor } : row));
    });
  }, []);

  const onAgregarColumna = useCallback((campo: CampoProducto) => {
    const header = generarHeaderSintetico(campo);
    setMapeo((prev) => [
      ...(prev ?? []),
      {
        headerOriginal: header,
        campoDetectado: campo,
        confianza: 'ninguna',
        ignorar: false,
        sintetica: true,
      },
    ]);
    setFilasRaw((prev) => (prev ? prev.map((row) => ({ ...row, [header]: null })) : null));
  }, []);

  const onQuitarColumna = useCallback(
    (headerOriginal: string) => {
      const target = (mapeo ?? []).find((m) => m.headerOriginal === headerOriginal);
      if (!target?.sintetica) return;
      setMapeo((prev) => (prev ?? []).filter((m) => m.headerOriginal !== headerOriginal));
      setFilasRaw((prev) =>
        prev
          ? prev.map((row) => {
              const next = { ...row };
              delete next[headerOriginal];
              return next;
            })
          : null
      );
    },
    [mapeo]
  );

  const onBulkFill = useCallback(
    (headerOriginal: string, valorTexto: string, filaIndices: number[]) => {
      const set = new Set(filaIndices);
      setFilasRaw((prev) =>
        prev
          ? prev.map((row, i) =>
              set.has(i)
                ? { ...row, [headerOriginal]: valorTexto === '' ? null : valorTexto }
                : row
            )
          : null
      );
    },
    []
  );

  const onCalcularVentaPorMargen = useCallback(
    (headerPrecioVenta: string, porcentajeSobreCosto: number, filaIndices: number[]) => {
      const idxSet = new Set(filaIndices);
      setFilasRaw((prev) => {
        if (!prev || !mapeo) return prev;
        const v = validarFilas(prev, mapeo);
        return prev.map((row, i) => {
          if (!idxSet.has(i)) return row;
          const costoRaw = v[i]?.datos.precio_costo;
          const costo =
            typeof costoRaw === 'number' && !Number.isNaN(costoRaw) ? costoRaw : null;
          if (costo === null) return row;
          const venta =
            Math.round(costo * (1 + porcentajeSobreCosto / 100) * 100) / 100;
          return { ...row, [headerPrecioVenta]: venta };
        });
      });
    },
    [mapeo]
  );

  const onFilaDescartar = useCallback((index: number) => {
    setFilasRaw((prev) => (prev ? prev.filter((_, i) => i !== index) : null));
  }, []);

  const ejecutarImportacion = useCallback(async () => {
    if (!draft || !canEdit) return;
    const validas = filasValidadas.filter((f) => f.valida);
    const { unicas, duplicadasDescartadas } = deduplicarFilas(validas);
    const filas = unicas.map(filaValidadaToPayload);

    setLoading(true);
    try {
      const res = await fetch('/api/importar/ejecutar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filas,
          proveedor_id: draft.proveedorId,
          archivo_nombre: draft.archivo.nombreArchivo,
          origen: 'importacion_excel',
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
        archivo_nombre: draft.archivo.nombreArchivo,
      });
      clearImportDraft();
      router.push('/importar/resumen');
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [draft, canEdit, filasValidadas, router]);

  if (!filasRaw || !mapeo || !draft) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <p className="text-sm text-muted-foreground">
        <Link
          href={draft.saltoMapeoPorPerfil ? '/importar' : '/importar/mapeo'}
          className="underline underline-offset-4"
        >
          ← {draft.saltoMapeoPorPerfil ? 'Volver al inicio' : 'Volver al mapeo'}
        </Link>
      </p>

      {!canEdit ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tu rol no permite ejecutar la importación.
        </p>
      ) : null}

      <PreviewTable
        filas={filasValidadas}
        filasRaw={filasRaw}
        columnas={columnasPreview}
        onFilaEdit={onFilaEdit}
        onFilaDescartar={onFilaDescartar}
        onAgregarColumna={onAgregarColumna}
        onQuitarColumna={onQuitarColumna}
        onBulkFill={onBulkFill}
        onCalcularVentaPorMargen={onCalcularVentaPorMargen}
        onConfirmar={() => void ejecutarImportacion()}
        loading={loading || !canEdit}
      />
    </div>
  );
}
