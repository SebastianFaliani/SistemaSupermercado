import { obtenerUsuarioAutenticado } from './autenticacion.servicio.js';

export async function requerirAutenticacion(solicitud, respuesta, siguiente) {
  const cabecera = solicitud.headers.authorization;
  const token = cabecera?.startsWith('Bearer ') ? cabecera.slice(7) : null;

  if (!token) return respuesta.status(401).json({ mensaje: 'Autenticación requerida' });

  try {
    const usuario = await obtenerUsuarioAutenticado(token);
    if (!usuario) return respuesta.status(401).json({ mensaje: 'Sesión inválida' });
    solicitud.usuario = usuario;
    siguiente();
  } catch {
    respuesta.status(401).json({ mensaje: 'Sesión inválida o vencida' });
  }
}
