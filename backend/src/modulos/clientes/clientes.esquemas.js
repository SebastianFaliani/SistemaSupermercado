import { z } from 'zod';

export const esquemaConsultaClientes = z.object({ buscar: z.string().trim().max(160).optional(), estado: z.enum(['todos', 'activos', 'inactivos']).default('activos'), pagina: z.coerce.number().int().positive().default(1), limite: z.coerce.number().int().min(1).max(100).default(25) });
const opcional = (maximo) => z.union([z.string().trim().max(maximo), z.literal(''), z.null()]).optional();
const datos = { nombre: z.string().trim().min(2).max(160), tipo_documento: z.enum(['DNI', 'CUIT', 'CUIL', 'OTRO']).nullable().optional(), numero_documento: opcional(20), telefono: opcional(30), correo_electronico: z.union([z.string().trim().email().max(254), z.literal(''), z.null()]).optional(), direccion: opcional(255), observaciones: opcional(500), credito_habilitado: z.boolean().default(false), limite_credito: z.coerce.number().min(0).max(9999999999999.99).default(0), dias_vencimiento: z.coerce.number().int().min(1).max(365).default(30) };
export const esquemaCrearCliente = z.object(datos);
export const esquemaEditarCliente = z.object({ ...datos, esta_activo: z.boolean() });
export const esquemaIdCliente = z.coerce.number().int().positive();
export const esquemaCobranza = z.object({ medio: z.enum(['efectivo', 'debito', 'credito', 'transferencia']), monto: z.coerce.number().positive().max(9999999999999.99), observaciones: opcional(255) });
