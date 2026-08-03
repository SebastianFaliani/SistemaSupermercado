import { Router } from 'express';
import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { esquemaAbrirCaja, esquemaCerrarCaja, esquemaVenta } from './ventas.esquemas.js';
import { abrirCaja, cerrarCaja, crearVenta, listarCajasDisponibles, obtenerSesion, referenciasVenta, resumenCaja } from './ventas.servicio.js';

export const rutasVentas = Router(); rutasVentas.use(requerirAutenticacion);
rutasVentas.get('/caja/actual', requerirPermiso('caja.abrir'), async (req, res) => res.json({ dato: await obtenerSesion(req.usuario.id) }));
rutasVentas.get('/caja/disponibles', requerirPermiso('caja.abrir'), async (_req, res) => res.json({ datos: await listarCajasDisponibles() }));
rutasVentas.get('/caja/resumen', requerirPermiso('caja.cerrar'), async (req, res) => { const dato = await resumenCaja(req.usuario.id); if (!dato) return res.status(404).json({ mensaje: 'No tenés una caja abierta' }); res.json({ dato }); });
rutasVentas.post('/caja/abrir', requerirPermiso('caja.abrir'), async (req, res) => { const v = esquemaAbrirCaja.safeParse(req.body); if (!v.success) return res.status(400).json({ mensaje: 'Datos de apertura inválidos' }); try { res.status(201).json({ dato: await abrirCaja(req.usuario.id, v.data.caja_id, v.data.monto_inicial) }); } catch (error) { if (['CAJA_ABIERTA', 'CAJA_NO_DISPONIBLE'].includes(error.codigoPublico)) return res.status(409).json({ mensaje: error.message }); throw error; } });
rutasVentas.post('/caja/cerrar', requerirPermiso('caja.cerrar'), async (req, res) => { const v = esquemaCerrarCaja.safeParse(req.body); if (!v.success) return res.status(400).json({ mensaje: 'Monto contado inválido' }); try { res.json({ dato: await cerrarCaja(req.usuario.id, v.data.monto_contado) }); } catch (error) { if (error.codigoPublico === 'SIN_CAJA') return res.status(409).json({ mensaje: error.message }); throw error; } });
rutasVentas.get('/referencias', requerirPermiso('ventas.crear'), async (_req, res) => res.json({ datos: await referenciasVenta() }));
rutasVentas.post('/', requerirPermiso('ventas.crear'), async (req, res) => { const v = esquemaVenta.safeParse(req.body); if (!v.success) return res.status(400).json({ mensaje: 'Datos de venta inválidos' }); try { res.status(201).json({ dato: await crearVenta(req.usuario.id, v.data) }); } catch (error) { if (error.codigoPublico) return res.status(409).json({ mensaje: error.message }); throw error; } });
