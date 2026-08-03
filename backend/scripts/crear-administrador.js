import bcrypt from 'bcryptjs';

import { baseDatos } from '../src/configuracion/base-datos.js';

function obtenerArgumento(nombre) {
  const indice = process.argv.indexOf(`--${nombre}`);
  return indice >= 0 ? process.argv[indice + 1] : null;
}

const datos = {
  usuario: obtenerArgumento('usuario'),
  nombres: obtenerArgumento('nombres'),
  apellidos: obtenerArgumento('apellidos'),
  correo: obtenerArgumento('correo'),
  clave: process.env.ADMIN_CLAVE,
};

if (!datos.usuario || !datos.nombres || !datos.apellidos || !datos.clave) {
  console.error(
    'Uso: ADMIN_CLAVE="..." npm run admin:crear -- --usuario admin --nombres Nombre --apellidos Apellido [--correo correo@ejemplo.com]',
  );
  process.exitCode = 1;
} else if (datos.clave.length < 12) {
  console.error('ADMIN_CLAVE debe tener al menos 12 caracteres.');
  process.exitCode = 1;
} else {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const claveHash = await bcrypt.hash(datos.clave, 12);
    const [empleado] = await conexion.query(
      `INSERT INTO empleados
       (nombres, apellidos, correo_electronico, fecha_ingreso)
       VALUES (?, ?, ?, CURRENT_DATE())`,
      [datos.nombres, datos.apellidos, datos.correo],
    );
    const [usuario] = await conexion.query(
      `INSERT INTO usuarios (empleado_id, nombre_usuario, clave_hash,
       requiere_cambio_clave, fecha_cambio_clave) VALUES (?, ?, ?, FALSE, CURRENT_TIMESTAMP(3))`,
      [empleado.insertId, datos.usuario, claveHash],
    );
    await conexion.query(
      `INSERT INTO usuarios_roles (usuario_id, rol_id)
       SELECT ?, id FROM roles WHERE nombre = 'administrador'`,
      [usuario.insertId],
    );
    await conexion.commit();
    console.log(`Administrador creado: ${datos.usuario}`);
  } catch (error) {
    await conexion.rollback();
    console.error(`No se pudo crear el administrador: ${error.message}`);
    process.exitCode = 1;
  } finally {
    conexion.release();
  }
}

await baseDatos.end();
