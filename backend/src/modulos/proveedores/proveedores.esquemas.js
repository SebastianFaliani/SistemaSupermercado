import { z } from 'zod';

export const esquemaConsultaProveedores = z.object({
  buscar: z.string().trim().max(180).optional(),
  estado: z.enum(['todos', 'activos', 'inactivos']).default('activos'),
  cuenta: z.enum(['todas', 'deuda', 'vencida']).default('todas'),
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
  cuenta_tesoreria_id: z.coerce.number().int().positive().nullable().optional(),
  origen_efectivo: z.enum(['caja', 'tesoreria']).nullable().optional(),
  referencia: textoOpcional(100), observaciones: textoOpcional(255),
}).superRefine((datos, contexto) => {
  if (datos.medio !== 'efectivo' && !datos.cuenta_tesoreria_id) {
    contexto.addIssue({ code: 'custom', path: ['cuenta_tesoreria_id'], message: 'La cuenta de Tesorería es obligatoria' });
  }
  if (datos.medio === 'efectivo' && !datos.origen_efectivo) contexto.addIssue({ code: 'custom', path: ['origen_efectivo'], message: 'El origen del efectivo es obligatorio' });
  if (datos.medio === 'efectivo' && datos.origen_efectivo === 'tesoreria' && !datos.cuenta_tesoreria_id) contexto.addIssue({ code: 'custom', path: ['cuenta_tesoreria_id'], message: 'La cuenta de efectivo es obligatoria' });
  if (datos.medio === 'efectivo' && datos.origen_efectivo === 'caja' && datos.cuenta_tesoreria_id) contexto.addIssue({ code: 'custom', path: ['cuenta_tesoreria_id'], message: 'La caja no usa cuenta de Tesorería' });
});
