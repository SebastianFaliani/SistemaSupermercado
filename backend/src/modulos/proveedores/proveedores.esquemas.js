import { z } from 'zod';

export const esquemaConsultaProveedores = z.object({
  buscar: z.string().trim().max(180).optional(),
  estado: z.enum(['todos', 'activos', 'inactivos']).default('activos'),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(25),
});

const textoOpcional = (maximo) => z.string().trim().max(maximo).nullable().optional();
const datosProveedor = {
  razon_social: z.string().trim().min(2).max(160),
  nombre_fantasia: textoOpcional(160),
  cuit: z.union([z.string().trim().regex(/^\d{2}-?\d{8}-?\d$/), z.literal(''), z.null()]).optional(),
  condicion_iva: textoOpcional(60),
  persona_contacto: textoOpcional(120),
  telefono: textoOpcional(30),
  correo_electronico: z.union([z.string().trim().email().max(254), z.literal(''), z.null()]).optional(),
  direccion: textoOpcional(255),
  observaciones: textoOpcional(500),
};

export const esquemaCrearProveedor = z.object(datosProveedor);
export const esquemaEditarProveedor = z.object({ ...datosProveedor, esta_activo: z.boolean() });
export const esquemaIdProveedor = z.coerce.number().int().positive();
export const esquemaFacturaProveedor = z.object({
  orden_compra_id: z.coerce.number().int().positive().nullable().optional(),
  tipo_comprobante: z.enum(['factura', 'remito', 'nota_debito']),
  numero_comprobante: z.string().trim().min(1).max(80),
  fecha_emision: z.string().date(), fecha_vencimiento: z.string().date(),
  total: z.coerce.number().positive().max(9999999999999.99),
  observaciones: textoOpcional(500),
}).refine((datos) => datos.fecha_emision <= datos.fecha_vencimiento, 'El vencimiento es inválido');
export const esquemaPagoProveedor = z.object({
  medio: z.enum(['efectivo', 'transferencia', 'cheque', 'debito']),
  monto: z.coerce.number().positive().max(9999999999999.99),
  referencia: textoOpcional(100), observaciones: textoOpcional(255),
});
