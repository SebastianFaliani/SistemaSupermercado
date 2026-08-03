import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { comprobarBaseDatos } from './configuracion/base-datos.js';
import { entorno } from './configuracion/entorno.js';
import { rutasAutenticacion } from './modulos/seguridad/autenticacion.rutas.js';
import { rutasCatalogo } from './modulos/catalogo/catalogo.rutas.js';
import { rutasInventario } from './modulos/inventario/inventario.rutas.js';
import { rutasUsuarios } from './modulos/usuarios/usuarios.rutas.js';
import { rutasProveedores } from './modulos/proveedores/proveedores.rutas.js';
import { rutasCompras } from './modulos/compras/compras.rutas.js';

export const aplicacion = express();
const carpetaProyecto = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

aplicacion.disable('x-powered-by');
aplicacion.use(helmet());
aplicacion.use(cors({ origin: entorno.origenFrontend }));
aplicacion.use(express.json({ limit: '1mb' }));
aplicacion.use(
  '/imagenes_productos',
  express.static(resolve(carpetaProyecto, 'storage/imagenes_productos')),
);
aplicacion.use('/api/autenticacion', rutasAutenticacion);
aplicacion.use('/api/catalogo', rutasCatalogo);
aplicacion.use('/api/inventario', rutasInventario);
aplicacion.use('/api/usuarios', rutasUsuarios);
aplicacion.use('/api/proveedores', rutasProveedores);
aplicacion.use('/api/compras', rutasCompras);

aplicacion.get('/api/salud', async (_solicitud, respuesta) => {
  try {
    await comprobarBaseDatos();
    respuesta.json({ estado: 'ok', base_datos: 'conectada' });
  } catch {
    respuesta.status(503).json({ estado: 'degradado', base_datos: 'sin_conexion' });
  }
});

aplicacion.use((_solicitud, respuesta) => {
  respuesta.status(404).json({ mensaje: 'Ruta no encontrada' });
});

aplicacion.use((error, _solicitud, respuesta, _siguiente) => {
  void _siguiente;
  if (error.code === 'ER_DUP_ENTRY') {
    return respuesta.status(409).json({ mensaje: 'Ya existe un registro con ese código o nombre' });
  }
  console.error(error);
  respuesta.status(500).json({ mensaje: 'Ocurrió un error interno' });
});
