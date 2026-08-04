import { Router } from 'express';
import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { obtenerTablero } from './tablero.servicio.js';

export const rutasTablero = Router();
rutasTablero.use(requerirAutenticacion);
rutasTablero.get('/', async (_solicitud, respuesta) => respuesta.json({ dato: await obtenerTablero() }));
