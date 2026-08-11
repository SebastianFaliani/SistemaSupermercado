import jwt from 'jsonwebtoken';
import { entorno } from '../../configuracion/entorno.js';

export function crearTokenCliente(clienteId) {
  return jwt.sign({ sub: String(clienteId), tipo: 'cliente_ecommerce' }, entorno.jwt.secreto, { expiresIn: '30d' });
}

export function obtenerClienteToken(token) {
  if (!token) return null;
  try {
    const dato = jwt.verify(token, entorno.jwt.secreto);
    return dato.tipo === 'cliente_ecommerce' ? Number(dato.sub) : null;
  } catch {
    return null;
  }
}

export function requerirCliente(solicitud, respuesta, siguiente) {
  const cabecera = solicitud.headers.authorization;
  const id = obtenerClienteToken(cabecera?.startsWith('Bearer ') ? cabecera.slice(7) : null);
  if (!id) return respuesta.status(401).json({ mensaje: 'Acceso de cliente requerido' });
  solicitud.clienteId = id;
  siguiente();
}
