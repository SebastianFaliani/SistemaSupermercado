import { Router } from 'express';
import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { esquemaConsultaUsuarios, esquemaCrearUsuario, esquemaEditarUsuario, esquemaIdUsuario } from './usuarios.esquemas.js';
import { crearUsuario, editarUsuario, listarRoles, listarUsuarios } from './usuarios.servicio.js';

export const rutasUsuarios = Router();
rutasUsuarios.use(requerirAutenticacion);

rutasUsuarios.get('/', requerirPermiso('usuarios.ver'), async (solicitud, respuesta) => {
  const validacion = esquemaConsultaUsuarios.safeParse(solicitud.query);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Consulta inválida' });
  respuesta.json(await listarUsuarios(validacion.data));
});

rutasUsuarios.get('/roles', requerirPermiso('usuarios.ver'), async (_solicitud, respuesta) => {
  respuesta.json({ datos: await listarRoles() });
});

rutasUsuarios.post('/', requerirPermiso('usuarios.gestionar'), async (solicitud, respuesta) => {
  const validacion = esquemaCrearUsuario.safeParse(solicitud.body);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Datos de usuario inválidos', errores: validacion.error.flatten() });
  respuesta.status(201).json({ dato: await crearUsuario(validacion.data, solicitud.usuario.id) });
});

rutasUsuarios.put('/:id', requerirPermiso('usuarios.gestionar'), async (solicitud, respuesta) => {
  const id = esquemaIdUsuario.safeParse(solicitud.params.id);
  const datos = esquemaEditarUsuario.safeParse(solicitud.body);
  if (!id.success || !datos.success) return respuesta.status(400).json({ mensaje: 'Datos de usuario inválidos' });
  try {
    respuesta.json({ dato: await editarUsuario(id.data, datos.data, solicitud.usuario.id) });
  } catch (error) {
    if (error.codigoPublico === 'USUARIO_ACTUAL') return respuesta.status(409).json({ mensaje: error.message });
    if (error.codigoPublico === 'NO_ENCONTRADO') return respuesta.status(404).json({ mensaje: error.message });
    throw error;
  }
});
