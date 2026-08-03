import { z } from 'zod';

export const esquemaConsultaUsuarios = z.object({
  buscar: z.string().trim().max(180).optional(),
  estado: z.enum(['todos', 'activos', 'inactivos']).default('todos'),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(25),
});

const datosPersona = {
  nombre_usuario: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/),
  nombres: z.string().trim().min(2).max(100),
  apellidos: z.string().trim().min(2).max(100),
  numero_documento: z.string().trim().max(20).nullable().optional(),
  correo_electronico: z.string().trim().email().max(254).nullable().optional(),
  telefono: z.string().trim().max(30).nullable().optional(),
  rol_id: z.coerce.number().int().positive(),
};

export const esquemaCrearUsuario = z.object({
  ...datosPersona,
  clave: z.string().min(12).max(128),
});

export const esquemaEditarUsuario = z.object({
  ...datosPersona,
  esta_activo: z.boolean(),
  clave: z.union([z.string().min(12).max(128), z.literal('')]).optional(),
});

export const esquemaIdUsuario = z.coerce.number().int().positive();
