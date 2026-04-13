/**
 * Tipos del esquema `public` de Supabase (SmartStock).
 * Regenerar con `npm run gen:types` cuando tengas `SUPABASE_ACCESS_TOKEN` configurado.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      arca_config: {
        Row: {
          ambiente: Database['public']['Enums']['arca_ambiente'];
          certificado_pem: string | null;
          clave_privada_pem: string | null;
          created_at: string;
          cuit_emisor: string | null;
          id: string;
          punto_de_venta: number | null;
          tenant_id: string;
          ticket_acceso: string | null;
          ticket_expiracion: string | null;
          ticket_sign: string | null;
          ultimo_comprobante: number | null;
          updated_at: string;
        };
        Insert: {
          ambiente?: Database['public']['Enums']['arca_ambiente'];
          certificado_pem?: string | null;
          clave_privada_pem?: string | null;
          created_at?: string;
          cuit_emisor?: string | null;
          id?: string;
          punto_de_venta?: number | null;
          tenant_id: string;
          ticket_acceso?: string | null;
          ticket_expiracion?: string | null;
          ticket_sign?: string | null;
          ultimo_comprobante?: number | null;
          updated_at?: string;
        };
        Update: {
          ambiente?: Database['public']['Enums']['arca_ambiente'];
          certificado_pem?: string | null;
          clave_privada_pem?: string | null;
          created_at?: string;
          cuit_emisor?: string | null;
          id?: string;
          punto_de_venta?: number | null;
          tenant_id?: string;
          ticket_acceso?: string | null;
          ticket_expiracion?: string | null;
          ticket_sign?: string | null;
          ultimo_comprobante?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'arca_config_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: true;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
        ];
      };
      arca_log: {
        Row: {
          comprobante_id: string | null;
          created_at: string;
          error_codigo: string | null;
          error_mensaje: string | null;
          exitoso: boolean;
          id: string;
          operacion: string | null;
          request_xml: string | null;
          response_xml: string | null;
          servicio: string | null;
          tenant_id: string;
        };
        Insert: {
          comprobante_id?: string | null;
          created_at?: string;
          error_codigo?: string | null;
          error_mensaje?: string | null;
          exitoso?: boolean;
          id?: string;
          operacion?: string | null;
          request_xml?: string | null;
          response_xml?: string | null;
          servicio?: string | null;
          tenant_id: string;
        };
        Update: {
          comprobante_id?: string | null;
          created_at?: string;
          error_codigo?: string | null;
          error_mensaje?: string | null;
          exitoso?: boolean;
          id?: string;
          operacion?: string | null;
          request_xml?: string | null;
          response_xml?: string | null;
          servicio?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'arca_log_comprobante_id_fkey';
            columns: ['comprobante_id'];
            isOneToOne: false;
            referencedRelation: 'comprobante';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'arca_log_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
        ];
      };
      categoria: {
        Row: {
          activa: boolean;
          created_at: string;
          descripcion: string | null;
          id: string;
          nombre: string;
          tenant_id: string;
        };
        Insert: {
          activa?: boolean;
          created_at?: string;
          descripcion?: string | null;
          id?: string;
          nombre: string;
          tenant_id: string;
        };
        Update: {
          activa?: boolean;
          created_at?: string;
          descripcion?: string | null;
          id?: string;
          nombre?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categoria_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
        ];
      };
      cliente: {
        Row: {
          activo: boolean;
          condicion_iva: Database['public']['Enums']['condicion_iva'] | null;
          created_at: string;
          cuit_dni: string | null;
          direccion: string | null;
          email: string | null;
          id: string;
          nombre: string;
          notas: string | null;
          razon_social: string | null;
          telefono: string | null;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          activo?: boolean;
          condicion_iva?: Database['public']['Enums']['condicion_iva'] | null;
          created_at?: string;
          cuit_dni?: string | null;
          direccion?: string | null;
          email?: string | null;
          id?: string;
          nombre: string;
          notas?: string | null;
          razon_social?: string | null;
          telefono?: string | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          condicion_iva?: Database['public']['Enums']['condicion_iva'] | null;
          created_at?: string;
          cuit_dni?: string | null;
          direccion?: string | null;
          email?: string | null;
          id?: string;
          nombre?: string;
          notas?: string | null;
          razon_social?: string | null;
          telefono?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cliente_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
        ];
      };
      comprobante: {
        Row: {
          cae: string | null;
          cae_vencimiento: string | null;
          cliente_id: string | null;
          created_at: string;
          estado: Database['public']['Enums']['estado_comprobante'];
          fecha: string;
          id: string;
          iva_monto: number;
          iva_porcentaje: number;
          notas: string | null;
          numero: number;
          pdf_url: string | null;
          subtotal: number;
          tenant_id: string;
          tipo: Database['public']['Enums']['tipo_comprobante'];
          total: number;
          updated_at: string;
          usuario_id: string | null;
        };
        Insert: {
          cae?: string | null;
          cae_vencimiento?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          estado?: Database['public']['Enums']['estado_comprobante'];
          fecha?: string;
          id?: string;
          iva_monto?: number;
          iva_porcentaje?: number;
          notas?: string | null;
          numero: number;
          pdf_url?: string | null;
          subtotal?: number;
          tenant_id: string;
          tipo: Database['public']['Enums']['tipo_comprobante'];
          total?: number;
          updated_at?: string;
          usuario_id?: string | null;
        };
        Update: {
          cae?: string | null;
          cae_vencimiento?: string | null;
          cliente_id?: string | null;
          created_at?: string;
          estado?: Database['public']['Enums']['estado_comprobante'];
          fecha?: string;
          id?: string;
          iva_monto?: number;
          iva_porcentaje?: number;
          notas?: string | null;
          numero?: number;
          pdf_url?: string | null;
          subtotal?: number;
          tenant_id?: string;
          tipo?: Database['public']['Enums']['tipo_comprobante'];
          total?: number;
          updated_at?: string;
          usuario_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'comprobante_cliente_id_fkey';
            columns: ['cliente_id'];
            isOneToOne: false;
            referencedRelation: 'cliente';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comprobante_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comprobante_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuario';
            referencedColumns: ['id'];
          },
        ];
      };
      comprobante_item: {
        Row: {
          cantidad: number;
          comprobante_id: string;
          created_at: string;
          id: string;
          precio_unitario: number;
          producto_id: string;
          subtotal: number;
        };
        Insert: {
          cantidad: number;
          comprobante_id: string;
          created_at?: string;
          id?: string;
          precio_unitario: number;
          producto_id: string;
          subtotal: number;
        };
        Update: {
          cantidad?: number;
          comprobante_id?: string;
          created_at?: string;
          id?: string;
          precio_unitario?: number;
          producto_id?: string;
          subtotal?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'comprobante_item_comprobante_id_fkey';
            columns: ['comprobante_id'];
            isOneToOne: false;
            referencedRelation: 'comprobante';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comprobante_item_producto_id_fkey';
            columns: ['producto_id'];
            isOneToOne: false;
            referencedRelation: 'producto';
            referencedColumns: ['id'];
          },
        ];
      };
      importacion_log: {
        Row: {
          archivo_nombre: string;
          created_at: string;
          detalle_errores: Json | null;
          filas_con_error: number;
          filas_exitosas: number;
          id: string;
          origen: Database['public']['Enums']['origen_precio'];
          productos_actualizados: number;
          productos_creados: number;
          proveedor_id: string | null;
          tenant_id: string;
          total_filas: number;
          usuario_id: string | null;
        };
        Insert: {
          archivo_nombre: string;
          created_at?: string;
          detalle_errores?: Json | null;
          filas_con_error?: number;
          filas_exitosas?: number;
          id?: string;
          origen?: Database['public']['Enums']['origen_precio'];
          productos_actualizados?: number;
          productos_creados?: number;
          proveedor_id?: string | null;
          tenant_id: string;
          total_filas?: number;
          usuario_id?: string | null;
        };
        Update: {
          archivo_nombre?: string;
          created_at?: string;
          detalle_errores?: Json | null;
          filas_con_error?: number;
          filas_exitosas?: number;
          id?: string;
          origen?: Database['public']['Enums']['origen_precio'];
          productos_actualizados?: number;
          productos_creados?: number;
          proveedor_id?: string | null;
          tenant_id?: string;
          total_filas?: number;
          usuario_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'importacion_log_proveedor_id_fkey';
            columns: ['proveedor_id'];
            isOneToOne: false;
            referencedRelation: 'proveedor';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'importacion_log_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'importacion_log_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuario';
            referencedColumns: ['id'];
          },
        ];
      };
      modulo_config: {
        Row: {
          created_at: string;
          facturador_arca: boolean;
          facturador_simple: boolean;
          ia_precios: boolean;
          id: string;
          importador_excel: boolean;
          pedidos: boolean;
          presupuestos: boolean;
          stock: boolean;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          facturador_arca?: boolean;
          facturador_simple?: boolean;
          ia_precios?: boolean;
          id?: string;
          importador_excel?: boolean;
          pedidos?: boolean;
          presupuestos?: boolean;
          stock?: boolean;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          facturador_arca?: boolean;
          facturador_simple?: boolean;
          ia_precios?: boolean;
          id?: string;
          importador_excel?: boolean;
          pedidos?: boolean;
          presupuestos?: boolean;
          stock?: boolean;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'modulo_config_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: true;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
        ];
      };
      movimiento: {
        Row: {
          cantidad: number;
          created_at: string;
          id: string;
          motivo: string | null;
          producto_id: string;
          referencia_id: string | null;
          referencia_tipo: Database['public']['Enums']['referencia_tipo'] | null;
          stock_anterior: number;
          stock_posterior: number;
          tenant_id: string;
          tipo: Database['public']['Enums']['tipo_movimiento'];
          usuario_id: string | null;
        };
        Insert: {
          cantidad: number;
          created_at?: string;
          id?: string;
          motivo?: string | null;
          producto_id: string;
          referencia_id?: string | null;
          referencia_tipo?: Database['public']['Enums']['referencia_tipo'] | null;
          stock_anterior: number;
          stock_posterior: number;
          tenant_id: string;
          tipo: Database['public']['Enums']['tipo_movimiento'];
          usuario_id?: string | null;
        };
        Update: {
          cantidad?: number;
          created_at?: string;
          id?: string;
          motivo?: string | null;
          producto_id?: string;
          referencia_id?: string | null;
          referencia_tipo?: Database['public']['Enums']['referencia_tipo'] | null;
          stock_anterior?: number;
          stock_posterior?: number;
          tenant_id?: string;
          tipo?: Database['public']['Enums']['tipo_movimiento'];
          usuario_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'movimiento_producto_id_fkey';
            columns: ['producto_id'];
            isOneToOne: false;
            referencedRelation: 'producto';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimiento_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimiento_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuario';
            referencedColumns: ['id'];
          },
        ];
      };
      pedido: {
        Row: {
          cliente_id: string | null;
          comprobante_id: string | null;
          created_at: string;
          estado: Database['public']['Enums']['estado_pedido'];
          fecha: string;
          id: string;
          notas: string | null;
          tenant_id: string;
          total: number;
          updated_at: string;
          usuario_id: string | null;
        };
        Insert: {
          cliente_id?: string | null;
          comprobante_id?: string | null;
          created_at?: string;
          estado?: Database['public']['Enums']['estado_pedido'];
          fecha?: string;
          id?: string;
          notas?: string | null;
          tenant_id: string;
          total?: number;
          updated_at?: string;
          usuario_id?: string | null;
        };
        Update: {
          cliente_id?: string | null;
          comprobante_id?: string | null;
          created_at?: string;
          estado?: Database['public']['Enums']['estado_pedido'];
          fecha?: string;
          id?: string;
          notas?: string | null;
          tenant_id?: string;
          total?: number;
          updated_at?: string;
          usuario_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pedido_cliente_id_fkey';
            columns: ['cliente_id'];
            isOneToOne: false;
            referencedRelation: 'cliente';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pedido_comprobante_id_fkey';
            columns: ['comprobante_id'];
            isOneToOne: false;
            referencedRelation: 'comprobante';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pedido_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pedido_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuario';
            referencedColumns: ['id'];
          },
        ];
      };
      pedido_item: {
        Row: {
          cantidad: number;
          created_at: string;
          id: string;
          pedido_id: string;
          precio_unitario: number;
          producto_id: string;
          subtotal: number;
        };
        Insert: {
          cantidad: number;
          created_at?: string;
          id?: string;
          pedido_id: string;
          precio_unitario: number;
          producto_id: string;
          subtotal: number;
        };
        Update: {
          cantidad?: number;
          created_at?: string;
          id?: string;
          pedido_id?: string;
          precio_unitario?: number;
          producto_id?: string;
          subtotal?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'pedido_item_pedido_id_fkey';
            columns: ['pedido_id'];
            isOneToOne: false;
            referencedRelation: 'pedido';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pedido_item_producto_id_fkey';
            columns: ['producto_id'];
            isOneToOne: false;
            referencedRelation: 'producto';
            referencedColumns: ['id'];
          },
        ];
      };
      precio_historial: {
        Row: {
          created_at: string;
          id: string;
          margen_anterior: number | null;
          margen_nuevo: number | null;
          origen: Database['public']['Enums']['origen_precio'];
          precio_costo_anterior: number | null;
          precio_costo_nuevo: number | null;
          precio_venta_anterior: number | null;
          precio_venta_nuevo: number | null;
          producto_id: string;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          margen_anterior?: number | null;
          margen_nuevo?: number | null;
          origen?: Database['public']['Enums']['origen_precio'];
          precio_costo_anterior?: number | null;
          precio_costo_nuevo?: number | null;
          precio_venta_anterior?: number | null;
          precio_venta_nuevo?: number | null;
          producto_id: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          margen_anterior?: number | null;
          margen_nuevo?: number | null;
          origen?: Database['public']['Enums']['origen_precio'];
          precio_costo_anterior?: number | null;
          precio_costo_nuevo?: number | null;
          precio_venta_anterior?: number | null;
          precio_venta_nuevo?: number | null;
          producto_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'precio_historial_producto_id_fkey';
            columns: ['producto_id'];
            isOneToOne: false;
            referencedRelation: 'producto';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'precio_historial_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
        ];
      };
      producto: {
        Row: {
          activo: boolean;
          categoria_id: string | null;
          codigo: string;
          created_at: string;
          descripcion: string | null;
          fecha_vencimiento: string | null;
          id: string;
          imagen_url: string | null;
          nombre: string;
          precio_costo: number;
          precio_venta: number;
          proveedor_id: string | null;
          stock_actual: number;
          stock_minimo: number;
          tenant_id: string;
          unidad: Database['public']['Enums']['unidad_medida'];
          updated_at: string;
        };
        Insert: {
          activo?: boolean;
          categoria_id?: string | null;
          codigo: string;
          created_at?: string;
          descripcion?: string | null;
          fecha_vencimiento?: string | null;
          id?: string;
          imagen_url?: string | null;
          nombre: string;
          precio_costo?: number;
          precio_venta?: number;
          proveedor_id?: string | null;
          stock_actual?: number;
          stock_minimo?: number;
          tenant_id: string;
          unidad?: Database['public']['Enums']['unidad_medida'];
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          categoria_id?: string | null;
          codigo?: string;
          created_at?: string;
          descripcion?: string | null;
          fecha_vencimiento?: string | null;
          id?: string;
          imagen_url?: string | null;
          nombre?: string;
          precio_costo?: number;
          precio_venta?: number;
          proveedor_id?: string | null;
          stock_actual?: number;
          stock_minimo?: number;
          tenant_id?: string;
          unidad?: Database['public']['Enums']['unidad_medida'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'producto_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categoria';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'producto_proveedor_id_fkey';
            columns: ['proveedor_id'];
            isOneToOne: false;
            referencedRelation: 'proveedor';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'producto_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
        ];
      };
      proveedor: {
        Row: {
          activo: boolean;
          created_at: string;
          cuit: string | null;
          direccion: string | null;
          email: string | null;
          id: string;
          mapeo_excel: Json | null;
          nombre: string;
          notas: string | null;
          telefono: string | null;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          activo?: boolean;
          created_at?: string;
          cuit?: string | null;
          direccion?: string | null;
          email?: string | null;
          id?: string;
          mapeo_excel?: Json | null;
          nombre: string;
          notas?: string | null;
          telefono?: string | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          created_at?: string;
          cuit?: string | null;
          direccion?: string | null;
          email?: string | null;
          id?: string;
          mapeo_excel?: Json | null;
          nombre?: string;
          notas?: string | null;
          telefono?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'proveedor_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant: {
        Row: {
          activo: boolean;
          condicion_iva: Database['public']['Enums']['condicion_iva'] | null;
          created_at: string;
          cuit: string | null;
          domicilio: string | null;
          email: string | null;
          id: string;
          logo_url: string | null;
          nombre: string;
          plan: Database['public']['Enums']['plan_tipo'];
          punto_de_venta: number;
          razon_social: string | null;
          telefono: string | null;
          updated_at: string;
        };
        Insert: {
          activo?: boolean;
          condicion_iva?: Database['public']['Enums']['condicion_iva'] | null;
          created_at?: string;
          cuit?: string | null;
          domicilio?: string | null;
          email?: string | null;
          id?: string;
          logo_url?: string | null;
          nombre: string;
          plan?: Database['public']['Enums']['plan_tipo'];
          punto_de_venta?: number;
          razon_social?: string | null;
          telefono?: string | null;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          condicion_iva?: Database['public']['Enums']['condicion_iva'] | null;
          created_at?: string;
          cuit?: string | null;
          domicilio?: string | null;
          email?: string | null;
          id?: string;
          logo_url?: string | null;
          nombre?: string;
          plan?: Database['public']['Enums']['plan_tipo'];
          punto_de_venta?: number;
          razon_social?: string | null;
          telefono?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      usuario: {
        Row: {
          activo: boolean;
          apellido: string;
          created_at: string;
          email: string;
          id: string;
          nombre: string;
          rol: Database['public']['Enums']['rol_usuario'];
          tenant_id: string;
        };
        Insert: {
          activo?: boolean;
          apellido: string;
          created_at?: string;
          email: string;
          id: string;
          nombre: string;
          rol?: Database['public']['Enums']['rol_usuario'];
          tenant_id: string;
        };
        Update: {
          activo?: boolean;
          apellido?: string;
          created_at?: string;
          email?: string;
          id?: string;
          nombre?: string;
          rol?: Database['public']['Enums']['rol_usuario'];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usuario_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      activar_plan: {
        Args: { p_plan: Database['public']['Enums']['plan_tipo']; p_tenant_id: string };
        Returns: undefined;
      };
      registrar_movimiento: {
        Args: {
          p_cantidad: number;
          p_motivo?: string | null;
          p_producto_id: string;
          p_referencia_id?: string | null;
          p_referencia_tipo?: Database['public']['Enums']['referencia_tipo'] | null;
          p_tenant_id: string;
          p_tipo: Database['public']['Enums']['tipo_movimiento'];
          p_usuario_id?: string | null;
        };
        Returns: Database['public']['Tables']['movimiento']['Row'];
      };
      siguiente_numero_comprobante: {
        Args: {
          p_tenant_id: string;
          p_tipo: Database['public']['Enums']['tipo_comprobante'];
        };
        Returns: number;
      };
    };
    Enums: {
      arca_ambiente: 'homologacion' | 'produccion';
      condicion_iva:
        | 'responsable_inscripto'
        | 'monotributista'
        | 'exento'
        | 'consumidor_final';
      estado_comprobante: 'borrador' | 'emitido' | 'pendiente_arca' | 'error_arca' | 'anulado';
      estado_pedido: 'borrador' | 'confirmado' | 'entregado' | 'cancelado';
      origen_precio: 'manual' | 'importacion_excel' | 'ia_pdf';
      plan_tipo: 'base' | 'completo';
      referencia_tipo: 'factura' | 'pedido' | 'importacion' | 'manual' | 'ajuste_inventario';
      rol_usuario: 'admin' | 'operador' | 'visor';
      tipo_comprobante:
        | 'factura_a'
        | 'factura_b'
        | 'factura_c'
        | 'nota_credito_a'
        | 'nota_credito_b'
        | 'nota_credito_c'
        | 'remito'
        | 'presupuesto';
      tipo_movimiento: 'entrada' | 'salida' | 'ajuste';
      unidad_medida: 'unidad' | 'kg' | 'litro' | 'metro' | 'caja' | 'pack' | 'gramo' | 'ml';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
        Database['public']['Views'])
    ? (Database['public']['Tables'] &
        Database['public']['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;
