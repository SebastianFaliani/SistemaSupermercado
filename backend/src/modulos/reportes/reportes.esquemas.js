import { z } from 'zod';

export const esquemaPeriodoReporte = z.object({
  fecha_desde: z.string().date(),
  fecha_hasta: z.string().date(),
}).refine((datos) => datos.fecha_desde <= datos.fecha_hasta, 'El período es inválido');
