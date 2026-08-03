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
