import { z } from 'zod';

export const esquemaConsultaCompras = z.object({
  buscar: z.string().trim().max(180).optional(),
  estado: z.enum(['todos', 'borrador', 'enviada', 'recibida', 'cancelada']).default('todos'),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(25),
});

export const esquemaCrearCompra = z.object({
  proveedor_id: z.coerce.number().int().positive(),
  fecha_esperada: z.union([z.string().date(), z.literal(''), z.null()]).optional(),
  observaciones: z.string().trim().max(500).nullable().optional(),
  modalidad_entrega: z.enum(['entrega_proveedor', 'retiro_propio']).default('entrega_proveedor'),
  responsable_retiro: z.string().trim().max(120).nullable().optional(),
  numero_comprobante: z.string().trim().max(80).nullable().optional(),
  detalles: z.array(z.object({
    producto_id: z.coerce.number().int().positive(),
    cantidad: z.coerce.number().positive().max(999999999999.999),
    costo_unitario: z.coerce.number().min(0).max(9999999999999.99),
  })).min(1).max(100).refine((items) => new Set(items.map((item) => item.producto_id)).size === items.length, 'No puede repetirse un producto'),
});

export const esquemaIdCompra = z.coerce.number().int().positive();
export const esquemaEditarCompra = esquemaCrearCompra;
