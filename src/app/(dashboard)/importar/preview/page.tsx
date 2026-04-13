'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDashboardRole } from '@/components/dashboard/dashboard-role-context';
import { PreviewTable } from '@/components/importar/preview-table';
import {
  clearImportDraft,
  readImportDraft,
  writeImportResult,
  type ImportDraftV1,
} from '@/lib/importar/draft';
import { type CampoProducto } from '@/lib/normalizador/aliases';
import { deduplicarFilas } from '@/lib/normalizador/deduplicar';
import type { MapeoColumna } from '@/lib/normalizador/mapear';
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

  const camposActivos = useMemo(() => {
    if (!mapeo) return [];
    const s = new Set<CampoProducto>();
    for (const c of mapeo) {
      if (!c.ignorar && c.campoDetectado) s.add(c.campoDetectado);
    }
    return Array.from(s);
  }, [mapeo]);

  const onFilaEdit = useCallback(
    (index: number, campo: CampoProducto, valor: string | number | null) => {
      setFilasRaw((prev) => {
        if (!prev || !mapeo) return prev;
        const col = mapeo.find((m) => m.campoDetectado === campo && !m.ignorar);
        if (!col) return prev;
        return prev.map((row, i) =>
          i === index ? { ...row, [col.headerOriginal]: valor } : row
        );
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
        camposActivos={camposActivos}
        onFilaEdit={onFilaEdit}
        onFilaDescartar={onFilaDescartar}
        onConfirmar={() => void ejecutarImportacion()}
        loading={loading || !canEdit}
      />
    </div>
  );
}
