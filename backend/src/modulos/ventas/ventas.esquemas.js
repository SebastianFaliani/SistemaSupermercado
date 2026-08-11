import { z } from 'zod';

export const esquemaAbrirCaja = z.object({
  caja_id: z.coerce.number().int().positive(),
  monto_inicial: z.coerce.number().min(0).max(9999999999999.99),
});
export const esquemaCerrarCaja = z.object({ monto_contado: z.coerce.number().min(0).max(9999999999999.99) });
export const esquemaMovimientoCaja = z.object({
  tipo: z.enum(['ingreso', 'egreso']),
  monto: z.coerce.number().positive().max(9999999999999.99),
  motivo: z.string().trim().min(5).max(255),
});
export const esquemaConsultaCajas = z.object({
  fecha_desde: z.string().date().optional(), fecha_hasta: z.string().date().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(25),
});
export const esquemaIdCaja = z.coerce.number().int().positive();
export const esquemaCaja = z.object({
  codigo: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_-]+$/i),
  nombre: z.string().trim().min(2).max(100),
  esta_activa: z.boolean().default(true),
});
export const esquemaVenta = z.object({
  cliente_id: z.coerce.number().int().positive().nullable().optional(),
  detalles: z.array(z.object({ producto_id: z.coerce.number().int().positive(), cantidad: z.coerce.number().positive().max(999999999999.999) })).min(1).max(200)
    .refine((items) => new Set(items.map((item) => item.producto_id)).size === items.length, 'No puede repetirse un producto'),
  pagos: z.array(z.object({ medio: z.enum(['efectivo', 'debito', 'credito', 'transferencia']), monto: z.coerce.number().positive() })).max(4)
    .refine((pagos) => new Set(pagos.map((pago) => pago.medio)).size === pagos.length, 'No puede repetirse un medio de pago'),
  efectivo_recibido: z.coerce.number().nonnegative().max(9999999999999.99).nullable().optional(),
}).superRefine((datos, contexto) => {
  const efectivoAplicado = datos.pagos.find((pago) => pago.medio === 'efectivo')?.monto || 0;
  if (efectivoAplicado > 0 && Number(datos.efectivo_recibido || 0) + 0.009 < efectivoAplicado) {
    contexto.addIssue({ code: 'custom', path: ['efectivo_recibido'], message: 'El efectivo recibido no puede ser menor al aplicado' });
  }
  if (!efectivoAplicado && Number(datos.efectivo_recibido || 0) > 0) {
    contexto.addIssue({ code: 'custom', path: ['efectivo_recibido'], message: 'No corresponde efectivo recibido sin pago en efectivo' });
  }
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
