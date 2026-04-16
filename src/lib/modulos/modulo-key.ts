export type ModuloKey =
  | 'stock'
  | 'importador_excel'
  | 'facturador_simple'
  | 'facturador_arca'
  | 'pedidos'
  | 'presupuestos'
  | 'ia_precios'
  | 'analizador_rentabilidad';

export interface ModulosConfig {
  stock: boolean;
  importador_excel: boolean;
  facturador_simple: boolean;
  facturador_arca: boolean;
  pedidos: boolean;
  presupuestos: boolean;
  ia_precios: boolean;
  analizador_rentabilidad: boolean;
}

export const DEFAULT_MODULOS: ModulosConfig = {
  stock: true,
  importador_excel: true,
  facturador_simple: false,
  facturador_arca: false,
  pedidos: false,
  presupuestos: false,
  ia_precios: false,
  analizador_rentabilidad: false,
};
