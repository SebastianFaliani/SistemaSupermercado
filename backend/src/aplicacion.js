import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { comprobarBaseDatos } from './configuracion/base-datos.js';
import { entorno } from './configuracion/entorno.js';
import { rutasAutenticacion } from './modulos/seguridad/autenticacion.rutas.js';
import { rutasCatalogo } from './modulos/catalogo/catalogo.rutas.js';

export const aplicacion = express();

aplicacion.disable('x-powered-by');
aplicacion.use(helmet());
aplicacion.use(cors({ origin: entorno.origenFrontend }));
aplicacion.use(express.json({ limit: '1mb' }));
aplicacion.use('/api/autenticacion', rutasAutenticacion);
aplicacion.use('/api/catalogo', rutasCatalogo);

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
