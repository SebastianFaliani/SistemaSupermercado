import { z } from 'zod';

export const esquemaAbrirCaja = z.object({
  caja_id: z.coerce.number().int().positive(),
  monto_inicial: z.coerce.number().min(0).max(9999999999999.99),
});
export const esquemaCerrarCaja = z.object({ monto_contado: z.coerce.number().min(0).max(9999999999999.99) });
export const esquemaVenta = z.object({
  detalles: z.array(z.object({ producto_id: z.coerce.number().int().positive(), cantidad: z.coerce.number().positive().max(999999999999.999) })).min(1).max(200)
    .refine((items) => new Set(items.map((item) => item.producto_id)).size === items.length, 'No puede repetirse un producto'),
  pagos: z.array(z.object({ medio: z.enum(['efectivo', 'debito', 'credito', 'transferencia']), monto: z.coerce.number().positive() })).min(1).max(4)
    .refine((pagos) => new Set(pagos.map((pago) => pago.medio)).size === pagos.length, 'No puede repetirse un medio de pago'),
});

export const esquemaConsultaVentas = z.object({
  buscar: z.string().trim().max(120).optional(),
  fecha_desde: z.string().date().optional(),
  fecha_hasta: z.string().date().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(25),
});

export const esquemaIdVenta = z.coerce.number().int().positive();
export const esquemaAnularVenta = z.object({ motivo: z.string().trim().min(5).max(255) });
export const esquemaDevolucion = z.object({
  motivo: z.string().trim().min(5).max(255),
  devueltos: z.array(z.object({
    producto_id: z.coerce.number().int().positive(), cantidad: z.coerce.number().positive(),
    reintegra_stock: z.boolean(),
  })).min(1).max(100).refine((items) => new Set(items.map((item) => item.producto_id)).size === items.length, 'No puede repetirse un producto devuelto'),
  reemplazos: z.array(z.object({
    producto_id: z.coerce.number().int().positive(), cantidad: z.coerce.number().positive(),
  })).max(100).default([]).refine((items) => new Set(items.map((item) => item.producto_id)).size === items.length, 'No puede repetirse un reemplazo'),
  medio: z.enum(['efectivo', 'debito', 'credito', 'transferencia']).optional(),
});
