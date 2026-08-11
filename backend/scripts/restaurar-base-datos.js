import { closeSync, openSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

import mysql from 'mysql2/promise';

import { entorno } from '../src/configuracion/entorno.js';
import {
  argumentosConexion,
  ejecutar,
  encontrarEjecutable,
} from './utilidades-respaldo.js';

const argumento = process.argv.find((valor) => valor.startsWith('--archivo='));
const destinoArgumento = process.argv.find((valor) =>
  valor.startsWith('--destino='),
);
const archivo = argumento
  ? resolve(argumento.slice('--archivo='.length))
  : null;
const destino = destinoArgumento?.slice('--destino='.length);

if (!archivo || !destino) {
  console.error(
    'Uso: npm run db:restaurar -- --archivo=RUTA --destino=NOMBRE_restauracion',
  );
  process.exit(1);
}
if (!/^[a-zA-Z0-9_]+_restauracion$/.test(destino)) {
  console.error(
    'Por seguridad, la base de destino debe terminar en _restauracion.',
  );
  process.exit(1);
}
if (destino === entorno.baseDatos.nombre) {
  console.error(
    'No se permite restaurar sobre la base configurada para la aplicación.',
  );
  process.exit(1);
}

await access(archivo);
const conexion = await mysql.createConnection({
  host: entorno.baseDatos.host,
  port: entorno.baseDatos.puerto,
  user: entorno.baseDatos.usuario,
  password: entorno.baseDatos.clave,
});

try {
  await conexion.query(
    `CREATE DATABASE IF NOT EXISTS \`${destino}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  const utilidad = await encontrarEjecutable('cliente');
  const entrada = openSync(archivo, 'r');
  try {
    await ejecutar(
      utilidad,
      [...argumentosConexion(entorno.baseDatos), destino],
      {
        clave: entorno.baseDatos.clave,
        stdio: [entrada, 'ignore', 'pipe'],
      },
    );
  } finally {
    closeSync(entrada);
  }
  const [tablas] = await conexion.query(
    'SELECT COUNT(*) AS cantidad FROM information_schema.tables WHERE table_schema = ?',
    [destino],
  );
  if (Number(tablas[0].cantidad) === 0)
    throw new Error('La restauración no generó tablas.');
  console.log(
    `Restauración verificada en ${destino}: ${tablas[0].cantidad} tablas.`,
  );
} catch (error) {
  console.error(`No se pudo restaurar el respaldo: ${error.message}`);
  process.exitCode = 1;
} finally {
  await conexion.end();
}
