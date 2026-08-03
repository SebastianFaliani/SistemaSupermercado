import { Router } from 'express';
import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { esquemaAjusteStock, esquemaConsultaMovimientos, esquemaConsultaStock } from './inventario.esquemas.js';
import { ajustarStock, listarMovimientos, listarStock, listarUbicaciones } from './inventario.servicio.js';

export const rutasInventario = Router();
rutasInventario.use(requerirAutenticacion);

rutasInventario.get('/ubicaciones', requerirPermiso('stock.ver'), async (_solicitud, respuesta) => {
  respuesta.json({ datos: await listarUbicaciones() });
});

rutasInventario.get('/stock', requerirPermiso('stock.ver'), async (solicitud, respuesta) => {
  const validacion = esquemaConsultaStock.safeParse(solicitud.query);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Consulta inválida' });
  respuesta.json(await listarStock(validacion.data));
});

rutasInventario.get('/movimientos', requerirPermiso('stock.ver'), async (solicitud, respuesta) => {
  const validacion = esquemaConsultaMovimientos.safeParse(solicitud.query);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Consulta inválida' });
  respuesta.json(await listarMovimientos(validacion.data));
});

rutasInventario.post('/ajustes', requerirPermiso('stock.ajustar'), async (solicitud, respuesta) => {
  const validacion = esquemaAjusteStock.safeParse(solicitud.body);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Datos de ajuste inválidos', errores: validacion.error.flatten() });
  try {
    const resultado = await ajustarStock(validacion.data, solicitud.usuario.id);
    respuesta.status(201).json({ dato: resultado });
  } catch (error) {
    if (error.codigoPublico === 'SIN_CAMBIOS') return respuesta.status(409).json({ mensaje: error.message });
    if (error.codigoPublico === 'CANTIDAD_ENTERA') return respuesta.status(400).json({ mensaje: error.message });
    throw error;
  }
});
