import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { baseDatos } from '../src/configuracion/base-datos.js';

const directorioActual = dirname(fileURLToPath(import.meta.url));
const directorioMigraciones = resolve(
  directorioActual,
  '../../base_datos/migraciones',
);

async function prepararControlMigraciones() {
  await baseDatos.query(`
    CREATE TABLE IF NOT EXISTS migraciones (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      nombre VARCHAR(255) NOT NULL,
      fecha_aplicacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_migraciones_nombre (nombre)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function obtenerMigracionesPendientes() {
  const archivos = (await readdir(directorioMigraciones))
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort();
  const [filas] = await baseDatos.query('SELECT nombre FROM migraciones');
  const aplicadas = new Set(filas.map(({ nombre }) => nombre));
  return archivos.filter((archivo) => !aplicadas.has(archivo));
}

async function aplicarMigracion(nombre) {
  const sql = await readFile(resolve(directorioMigraciones, nombre), 'utf8');
  const sentencias = sql
    .split(';')
    .map((sentencia) => sentencia.trim())
    .filter(Boolean);
  const conexion = await baseDatos.getConnection();

  try {
    for (const sentencia of sentencias) {
      await conexion.query(sentencia);
    }
    await conexion.query('INSERT INTO migraciones (nombre) VALUES (?)', [nombre]);
    console.log(`Aplicada: ${nombre}`);
  } finally {
    conexion.release();
  }
}

try {
  await prepararControlMigraciones();
  const pendientes = await obtenerMigracionesPendientes();

  if (pendientes.length === 0) {
    console.log('La base de datos está actualizada.');
  }

  for (const migracion of pendientes) {
    await aplicarMigracion(migracion);
  }
} finally {
  await baseDatos.end();
}
