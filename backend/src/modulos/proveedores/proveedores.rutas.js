import { Router } from 'express';
import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { esquemaConsultaProveedores, esquemaCrearProveedor, esquemaEditarProveedor, esquemaIdProveedor } from './proveedores.esquemas.js';
import { crearProveedor, editarProveedor, listarProveedores } from './proveedores.servicio.js';

export const rutasProveedores = Router();
rutasProveedores.use(requerirAutenticacion);

rutasProveedores.get('/', requerirPermiso('compras.ver'), async (solicitud, respuesta) => {
  const validacion = esquemaConsultaProveedores.safeParse(solicitud.query);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Consulta inválida' });
  respuesta.json(await listarProveedores(validacion.data));
});

rutasProveedores.post('/', requerirPermiso('compras.gestionar'), async (solicitud, respuesta) => {
  const validacion = esquemaCrearProveedor.safeParse(solicitud.body);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Datos de proveedor inválidos', errores: validacion.error.flatten() });
  respuesta.status(201).json({ dato: await crearProveedor(validacion.data) });
});

rutasProveedores.put('/:id', requerirPermiso('compras.gestionar'), async (solicitud, respuesta) => {
  const id = esquemaIdProveedor.safeParse(solicitud.params.id);
  const datos = esquemaEditarProveedor.safeParse(solicitud.body);
  if (!id.success || !datos.success) return respuesta.status(400).json({ mensaje: 'Datos de proveedor inválidos' });
  try {
    respuesta.json({ dato: await editarProveedor(id.data, datos.data) });
  } catch (error) {
    if (error.codigoPublico === 'NO_ENCONTRADO') return respuesta.status(404).json({ mensaje: error.message });
    throw error;
  }
});
