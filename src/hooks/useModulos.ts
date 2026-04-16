'use client';

import { useCallback, useEffect, useState } from 'react';

import { createBrowserClient } from '@/lib/supabase/client';
import { DEFAULT_MODULOS, type ModulosConfig } from '@/lib/modulos/modulo-key';

const REFRESH_EVENT = 'smartstock:modulos-refresh';

export function useModulos() {
  const [modulos, setModulos] = useState<ModulosConfig>(DEFAULT_MODULOS);
  const [loading, setLoading] = useState(true);

  const fetchModulos = useCallback(async () => {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from('modulo_config')
      .select(
        'stock, importador_excel, facturador_simple, facturador_arca, pedidos, presupuestos, ia_precios, analizador_rentabilidad',
      )
      .maybeSingle();

    if (data && !error) {
      setModulos({
        stock: data.stock ?? true,
        importador_excel: data.importador_excel ?? true,
        facturador_simple: data.facturador_simple ?? false,
        facturador_arca: data.facturador_arca ?? false,
        pedidos: data.pedidos ?? false,
        presupuestos: data.presupuestos ?? false,
        ia_precios: data.ia_precios ?? false,
        analizador_rentabilidad: data.analizador_rentabilidad ?? false,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchModulos();
  }, [fetchModulos]);

  useEffect(() => {
    const onRefresh = () => {
      void fetchModulos();
    };
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
  }, [fetchModulos]);

  return { modulos, loading, refetch: fetchModulos };
}

export function notifyModulosRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(REFRESH_EVENT));
  }
}
