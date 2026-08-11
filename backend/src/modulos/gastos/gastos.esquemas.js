import { z } from 'zod';
const opcional = (maximo) => z.union([z.string().trim().max(maximo), z.literal(''), z.null()]).optional();
export const esquemaConsultaGastos = z.object({ buscar: z.string().trim().max(180).optional(), estado: z.enum(['todos', 'pendientes', 'pagados', 'vencidos', 'anulados']).default('pendientes'), categoria_id: z.coerce.number().int().positive().optional(), pagina: z.coerce.number().int().positive().default(1), limite: z.coerce.number().int().min(1).max(100).default(25) });
export const esquemaGasto = z.object({ categoria_gasto_id: z.coerce.number().int().positive(), proveedor_id: z.coerce.number().int().positive().nullable().optional(), concepto: z.string().trim().min(2).max(180), numero_comprobante: opcional(80), fecha_emision: z.string().date(), fecha_vencimiento: z.string().date(), total: z.coerce.number().positive().max(9999999999999.99), es_recurrente: z.boolean().default(false), frecuencia: z.enum(['semanal', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual']).nullable().optional(), observaciones: opcional(500) }).refine((d) => d.fecha_emision <= d.fecha_vencimiento, 'Vencimiento inválido').refine((d) => !d.es_recurrente || d.frecuencia, 'Frecuencia requerida');
export const esquemaPagoGasto = z.object({ medio: z.enum(['efectivo', 'transferencia', 'debito', 'cheque']), monto: z.coerce.number().positive().max(9999999999999.99), cuenta_tesoreria_id: z.coerce.number().int().positive().nullable().optional(), origen_efectivo: z.enum(['caja', 'tesoreria']).nullable().optional(), referencia: opcional(100) }).superRefine((datos, contexto) => {
  if (datos.medio !== 'efectivo' && !datos.cuenta_tesoreria_id) contexto.addIssue({ code: 'custom', path: ['cuenta_tesoreria_id'], message: 'Cuenta requerida' });
  if (datos.medio === 'efectivo' && !datos.origen_efectivo) contexto.addIssue({ code: 'custom', path: ['origen_efectivo'], message: 'Origen requerido' });
  if (datos.medio === 'efectivo' && datos.origen_efectivo === 'tesoreria' && !datos.cuenta_tesoreria_id) contexto.addIssue({ code: 'custom', path: ['cuenta_tesoreria_id'], message: 'Cuenta requerida' });
  if (datos.medio === 'efectivo' && datos.origen_efectivo === 'caja' && datos.cuenta_tesoreria_id) contexto.addIssue({ code: 'custom', path: ['cuenta_tesoreria_id'], message: 'La caja no usa cuenta de Tesorería' });
});
export const esquemaAnularGasto = z.object({ motivo: z.string().trim().min(3).max(255) });
export const esquemaCategoriaGasto = z.object({ nombre: z.string().trim().min(2).max(100) });
export const esquemaIdGasto = z.coerce.number().int().positive();
