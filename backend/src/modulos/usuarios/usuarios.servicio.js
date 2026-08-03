import bcrypt from 'bcryptjs';
import { baseDatos } from '../../configuracion/base-datos.js';

export async function listarUsuarios(consulta) {
  const condiciones = [];
  const parametros = [];
  if (consulta.buscar) {
    condiciones.push(`(u.nombre_usuario LIKE ? OR e.nombres LIKE ? OR e.apellidos LIKE ?
      OR e.numero_documento LIKE ? OR e.correo_electronico LIKE ?)`);
    const patron = `%${consulta.buscar}%`;
    parametros.push(patron, patron, patron, patron, patron);
  }
  if (consulta.estado !== 'todos') {
    condiciones.push('u.esta_activo = ?');
    parametros.push(consulta.estado === 'activos');
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const desplazamiento = (consulta.pagina - 1) * consulta.limite;
  const desde = `FROM usuarios u
    LEFT JOIN empleados e ON e.id = u.empleado_id
    LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
    LEFT JOIN roles r ON r.id = ur.rol_id ${donde}`;
  const [[datos], [conteo]] = await Promise.all([
    baseDatos.query(
      `SELECT u.id, u.nombre_usuario, u.esta_activo, u.fecha_ultimo_acceso,
       e.nombres, e.apellidos, e.numero_documento, e.correo_electronico, e.telefono,
       r.id AS rol_id, r.nombre AS rol ${desde}
       ORDER BY e.apellidos, e.nombres, u.nombre_usuario LIMIT ? OFFSET ?`,
      [...parametros, consulta.limite, desplazamiento],
    ),
    baseDatos.query(`SELECT COUNT(DISTINCT u.id) AS total ${desde}`, parametros),
  ]);
  return { datos, total: conteo[0].total, pagina: consulta.pagina, limite: consulta.limite };
}

export async function listarRoles() {
  const [datos] = await baseDatos.query(
    'SELECT id, nombre, descripcion FROM roles WHERE esta_activo = TRUE ORDER BY nombre',
  );
  return datos;
}

export async function crearUsuario(datos, usuarioActualId) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [empleado] = await conexion.query(
      `INSERT INTO empleados
       (numero_documento, nombres, apellidos, correo_electronico, telefono, fecha_ingreso)
       VALUES (?, ?, ?, ?, ?, CURRENT_DATE)`,
      [datos.numero_documento || null, datos.nombres, datos.apellidos,
        datos.correo_electronico || null, datos.telefono || null],
    );
    const claveHash = await bcrypt.hash(datos.clave, 12);
    const [usuario] = await conexion.query(
      `INSERT INTO usuarios (empleado_id, nombre_usuario, clave_hash, requiere_cambio_clave)
       VALUES (?, ?, ?, TRUE)`,
      [empleado.insertId, datos.nombre_usuario, claveHash],
    );
    await conexion.query(
      `INSERT INTO usuarios_roles (usuario_id, rol_id, asignado_por_usuario_id)
       VALUES (?, ?, ?)`,
      [usuario.insertId, datos.rol_id, usuarioActualId],
    );
    await conexion.commit();
    return { id: usuario.insertId };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

export async function editarUsuario(id, datos, usuarioActualId) {
  if (id === usuarioActualId && !datos.esta_activo) {
    const error = new Error('No podés desactivar tu propio usuario');
    error.codigoPublico = 'USUARIO_ACTUAL';
    throw error;
  }
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [[usuario]] = await conexion.query(
      'SELECT empleado_id FROM usuarios WHERE id = ? FOR UPDATE', [id],
    );
    if (!usuario) {
      const error = new Error('No se encontró el usuario');
      error.codigoPublico = 'NO_ENCONTRADO';
      throw error;
    }
    await conexion.query(
      `UPDATE empleados SET numero_documento = ?, nombres = ?, apellidos = ?,
       correo_electronico = ?, telefono = ?, esta_activo = ? WHERE id = ?`,
      [datos.numero_documento || null, datos.nombres, datos.apellidos,
        datos.correo_electronico || null, datos.telefono || null,
        datos.esta_activo, usuario.empleado_id],
    );
    await conexion.query(
      `UPDATE usuarios SET nombre_usuario = ?, esta_activo = ?,
       intentos_fallidos = IF(?, 0, intentos_fallidos),
       fecha_bloqueo = IF(?, NULL, fecha_bloqueo) WHERE id = ?`,
      [datos.nombre_usuario, datos.esta_activo, datos.esta_activo, datos.esta_activo, id],
    );
    if (datos.clave) {
      const claveHash = await bcrypt.hash(datos.clave, 12);
      await conexion.query(
        `UPDATE usuarios SET clave_hash = ?, requiere_cambio_clave = TRUE,
         fecha_cambio_clave = CURRENT_TIMESTAMP(3) WHERE id = ?`,
        [claveHash, id],
      );
    }
    await conexion.query('DELETE FROM usuarios_roles WHERE usuario_id = ?', [id]);
    await conexion.query(
      `INSERT INTO usuarios_roles (usuario_id, rol_id, asignado_por_usuario_id)
       VALUES (?, ?, ?)`,
      [id, datos.rol_id, usuarioActualId],
    );
    await conexion.commit();
    return { id };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}
