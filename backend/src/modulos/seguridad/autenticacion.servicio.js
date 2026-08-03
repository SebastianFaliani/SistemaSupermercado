import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { baseDatos } from '../../configuracion/base-datos.js';
import { entorno } from '../../configuracion/entorno.js';

const MAXIMO_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

function crearToken(usuario) {
  if (!entorno.jwt.secreto) {
    throw new Error('JWT_SECRETO no está configurado');
  }

  return jwt.sign(
    { sub: String(usuario.id), nombre_usuario: usuario.nombre_usuario },
    entorno.jwt.secreto,
    { expiresIn: entorno.jwt.duracion, issuer: 'sistema-supermercado' },
  );
}

async function registrarFallo(usuario) {
  const debeBloquear = usuario.intentos_fallidos + 1 >= MAXIMO_INTENTOS;
  await baseDatos.query(
    `UPDATE usuarios
     SET intentos_fallidos = intentos_fallidos + 1,
         fecha_bloqueo = IF(?, CURRENT_TIMESTAMP(3), fecha_bloqueo)
     WHERE id = ?`,
    [debeBloquear, usuario.id],
  );
}

function estaBloqueado(usuario) {
  if (!usuario.fecha_bloqueo) return false;
  const desbloqueo = new Date(usuario.fecha_bloqueo).getTime() + MINUTOS_BLOQUEO * 60000;
  return Date.now() < desbloqueo;
}

async function cargarAccesos(usuarioId) {
  const [roles] = await baseDatos.query(
    `SELECT DISTINCT r.nombre
     FROM roles r
     JOIN usuarios_roles ur ON ur.rol_id = r.id
     WHERE ur.usuario_id = ? AND r.esta_activo = TRUE
     ORDER BY r.nombre`,
    [usuarioId],
  );
  const [permisos] = await baseDatos.query(
    `SELECT DISTINCT p.codigo
     FROM permisos p
     JOIN roles_permisos rp ON rp.permiso_id = p.id
     JOIN usuarios_roles ur ON ur.rol_id = rp.rol_id
     JOIN roles r ON r.id = ur.rol_id
     WHERE ur.usuario_id = ? AND r.esta_activo = TRUE
     ORDER BY p.codigo`,
    [usuarioId],
  );
  return {
    roles: roles.map(({ nombre }) => nombre),
    permisos: permisos.map(({ codigo }) => codigo),
  };
}

export async function iniciarSesion(nombreUsuario, clave) {
  const [filas] = await baseDatos.query(
    `SELECT id, empleado_id, nombre_usuario, clave_hash, esta_activo,
            intentos_fallidos, fecha_bloqueo
     FROM usuarios WHERE nombre_usuario = ? LIMIT 1`,
    [nombreUsuario],
  );
  const usuario = filas[0];

  if (!usuario || !usuario.esta_activo || estaBloqueado(usuario)) return null;

  if (!(await bcrypt.compare(clave, usuario.clave_hash))) {
    await registrarFallo(usuario);
    return null;
  }

  await baseDatos.query(
    `UPDATE usuarios SET intentos_fallidos = 0, fecha_bloqueo = NULL,
      fecha_ultimo_acceso = CURRENT_TIMESTAMP(3) WHERE id = ?`,
    [usuario.id],
  );
  const accesos = await cargarAccesos(usuario.id);
  return {
    token: crearToken(usuario),
    usuario: {
      id: usuario.id,
      empleado_id: usuario.empleado_id,
      nombre_usuario: usuario.nombre_usuario,
      ...accesos,
    },
  };
}

export async function obtenerUsuarioAutenticado(token) {
  const datos = jwt.verify(token, entorno.jwt.secreto, {
    issuer: 'sistema-supermercado',
  });
  const [filas] = await baseDatos.query(
    `SELECT id, empleado_id, nombre_usuario FROM usuarios
     WHERE id = ? AND esta_activo = TRUE LIMIT 1`,
    [datos.sub],
  );
  if (!filas[0]) return null;
  return { ...filas[0], ...(await cargarAccesos(filas[0].id)) };
}
