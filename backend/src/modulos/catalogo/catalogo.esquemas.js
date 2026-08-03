import { z } from 'zod';

const id = z.coerce.number().int().positive();
const dinero = z.coerce.number().min(0).max(9999999999999.99);

export const esquemaCategoria = z.object({
  nombre: z.string().trim().min(2).max(100),
  descripcion: z.string().trim().max(255).nullable().optional(),
  categoria_padre_id: id.nullable().optional(),
});

export const esquemaProducto = z.object({
  nombre: z.string().trim().min(2).max(180),
  descripcion: z.string().trim().max(5000).nullable().optional(),
  categoria_id: id,
  marca_id: id.nullable().optional(),
  unidad_medida_id: id,
  codigo_interno: z.string().trim().min(1).max(40).nullable().optional(),
  codigos_barra: z.array(z.string().trim().min(4).max(50)).min(1).max(10),
  contenido_neto: z.coerce.number().positive().nullable().optional(),
  precio_costo: dinero,
  precio_venta: dinero,
  precio_mayorista: dinero.nullable().optional(),
  cantidad_minima_mayorista: z.coerce.number().positive().nullable().optional(),
  stock_minimo: z.coerce.number().min(0).default(0),
  es_pesable: z.boolean().default(false),
  imagen_url: z.string().trim().max(500).nullable().optional(),
});

export const esquemaConsultaProductos = z.object({
  buscar: z.string().trim().max(180).optional(),
  categoria_id: id.optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(25),
});
