import { Router } from 'express';
import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { esquemaPeriodoReporte } from './reportes.esquemas.js';
import { obtenerReporte } from './reportes.servicio.js';

export const rutasReportes = Router();
rutasReportes.use(requerirAutenticacion);
rutasReportes.get('/ventas', requerirPermiso('reportes.ver'), async (solicitud, respuesta) => { const validacion = esquemaPeriodoReporte.safeParse(solicitud.query); if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Período inválido' }); respuesta.json({ dato: await obtenerReporte(validacion.data) }); });
