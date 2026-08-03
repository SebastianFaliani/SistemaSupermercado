import { Router } from 'express';
import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { esquemaConsultaCompras, esquemaCrearCompra, esquemaIdCompra } from './compras.esquemas.js';
import { crearCompra, listarCompras, recibirCompra, referenciasCompras } from './compras.servicio.js';

export const rutasCompras = Router(); rutasCompras.use(requerirAutenticacion);
rutasCompras.get('/', requerirPermiso('compras.ver'), async (req, res) => { const v = esquemaConsultaCompras.safeParse(req.query); if (!v.success) return res.status(400).json({ mensaje: 'Consulta inválida' }); res.json(await listarCompras(v.data)); });
rutasCompras.get('/referencias', requerirPermiso('compras.ver'), async (_req, res) => res.json(await referenciasCompras()));
rutasCompras.post('/', requerirPermiso('compras.gestionar'), async (req, res) => { const v = esquemaCrearCompra.safeParse(req.body); if (!v.success) return res.status(400).json({ mensaje: 'Datos de compra inválidos', errores: v.error.flatten() }); res.status(201).json({ dato: await crearCompra(v.data, req.usuario.id) }); });
rutasCompras.post('/:id/recibir', requerirPermiso('compras.gestionar'), async (req, res) => { const id = esquemaIdCompra.safeParse(req.params.id); if (!id.success) return res.status(400).json({ mensaje: 'Compra inválida' }); try { res.json({ dato: await recibirCompra(id.data, req.usuario.id) }); } catch (error) { if (error.codigoPublico === 'NO_ENCONTRADA') return res.status(404).json({ mensaje: error.message }); if (error.codigoPublico === 'ESTADO_INVALIDO') return res.status(409).json({ mensaje: error.message }); throw error; } });
