import { closeSync, openSync } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { entorno } from '../src/configuracion/entorno.js';
import {
  argumentosConexion,
  ejecutar,
  encontrarEjecutable,
  nombreFecha,
} from './utilidades-respaldo.js';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const directorio = resolve(raiz, 'base_datos/respaldos');
const archivo = resolve(
  directorio,
  `${entorno.baseDatos.nombre}_${nombreFecha()}.sql`,
);

await mkdir(directorio, { recursive: true });

try {
  const utilidad = await encontrarEjecutable('dump');
  const salida = openSync(archivo, 'wx');
  try {
    await ejecutar(
      utilidad,
      [
        ...argumentosConexion(entorno.baseDatos),
        '--single-transaction',
        '--routines',
        '--triggers',
        '--events',
        '--hex-blob',
        '--add-drop-table',
        entorno.baseDatos.nombre,
      ],
      { clave: entorno.baseDatos.clave, stdio: ['ignore', salida, 'pipe'] },
    );
  } finally {
    closeSync(salida);
  }
  const informacion = await stat(archivo);
  if (informacion.size < 100)
    throw new Error('El archivo generado está vacío o incompleto.');
  console.log(`Respaldo creado: ${archivo}`);
  console.log(`Tamaño: ${informacion.size.toLocaleString('es-AR')} bytes`);
} catch (error) {
  await unlink(archivo).catch(() => {});
  console.error(`No se pudo crear el respaldo: ${error.message}`);
  process.exitCode = 1;
}
