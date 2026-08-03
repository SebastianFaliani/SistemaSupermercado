import { Router } from 'express';
import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { esquemaAbrirCaja, esquemaVenta } from './ventas.esquemas.js';
import { abrirCaja, crearVenta, listarCajasDisponibles, obtenerSesion, referenciasVenta } from './ventas.servicio.js';

export const rutasVentas = Router(); rutasVentas.use(requerirAutenticacion);
rutasVentas.get('/caja/actual', requerirPermiso('caja.abrir'), async (req, res) => res.json({ dato: await obtenerSesion(req.usuario.id) }));
rutasVentas.get('/caja/disponibles', requerirPermiso('caja.abrir'), async (_req, res) => res.json({ datos: await listarCajasDisponibles() }));
rutasVentas.post('/caja/abrir', requerirPermiso('caja.abrir'), async (req, res) => { const v = esquemaAbrirCaja.safeParse(req.body); if (!v.success) return res.status(400).json({ mensaje: 'Datos de apertura inválidos' }); try { res.status(201).json({ dato: await abrirCaja(req.usuario.id, v.data.caja_id, v.data.monto_inicial) }); } catch (error) { if (['CAJA_ABIERTA', 'CAJA_NO_DISPONIBLE'].includes(error.codigoPublico)) return res.status(409).json({ mensaje: error.message }); throw error; } });
rutasVentas.get('/referencias', requerirPermiso('ventas.crear'), async (_req, res) => res.json({ datos: await referenciasVenta() }));
rutasVentas.post('/', requerirPermiso('ventas.crear'), async (req, res) => { const v = esquemaVenta.safeParse(req.body); if (!v.success) return res.status(400).json({ mensaje: 'Datos de venta inválidos' }); try { res.status(201).json({ dato: await crearVenta(req.usuario.id, v.data) }); } catch (error) { if (error.codigoPublico) return res.status(409).json({ mensaje: error.message }); throw error; } });
