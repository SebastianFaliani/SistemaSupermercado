import mysql from 'mysql2/promise';

import { entorno } from './entorno.js';

export const baseDatos = mysql.createPool({
  host: entorno.baseDatos.host,
  port: entorno.baseDatos.puerto,
  database: entorno.baseDatos.nombre,
  user: entorno.baseDatos.usuario,
  password: entorno.baseDatos.clave,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: false,
  timezone: 'Z',
});

export async function comprobarBaseDatos() {
  await baseDatos.query('SELECT 1');
}
