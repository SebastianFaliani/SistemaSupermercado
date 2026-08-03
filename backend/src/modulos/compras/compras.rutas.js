import { Router } from 'express';
import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { esquemaConsultaCompras, esquemaCrearCompra } from './compras.esquemas.js';
import { crearCompra, listarCompras, referenciasCompras } from './compras.servicio.js';

export const rutasCompras = Router(); rutasCompras.use(requerirAutenticacion);
rutasCompras.get('/', requerirPermiso('compras.ver'), async (req, res) => { const v = esquemaConsultaCompras.safeParse(req.query); if (!v.success) return res.status(400).json({ mensaje: 'Consulta inválida' }); res.json(await listarCompras(v.data)); });
rutasCompras.get('/referencias', requerirPermiso('compras.ver'), async (_req, res) => res.json(await referenciasCompras()));
rutasCompras.post('/', requerirPermiso('compras.gestionar'), async (req, res) => { const v = esquemaCrearCompra.safeParse(req.body); if (!v.success) return res.status(400).json({ mensaje: 'Datos de compra inválidos', errores: v.error.flatten() }); res.status(201).json({ dato: await crearCompra(v.data, req.usuario.id) }); });
