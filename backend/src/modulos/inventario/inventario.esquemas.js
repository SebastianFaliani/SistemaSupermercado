import { z } from 'zod';

export const esquemaConsultaStock = z.object({
  buscar: z.string().trim().max(180).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(25),
  solo_bajo_minimo: z.enum(['true', 'false']).optional().transform((valor) => valor === 'true'),
});

export const esquemaAjusteStock = z.object({
  producto_id: z.coerce.number().int().positive(),
  ubicacion_id: z.coerce.number().int().positive(),
  cantidad_nueva: z.coerce.number().min(0).max(999999999999.999),
  motivo: z.string().trim().min(5).max(255),
});
