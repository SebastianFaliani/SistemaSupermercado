import { Router } from 'express';
import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { esquemaConsultaClientes, esquemaCrearCliente, esquemaEditarCliente, esquemaIdCliente } from './clientes.esquemas.js';
import { crearCliente, editarCliente, listarClientes } from './clientes.servicio.js';

export const rutasClientes = Router(); rutasClientes.use(requerirAutenticacion);
rutasClientes.get('/', requerirPermiso('clientes.ver'), async (req, res) => { const v = esquemaConsultaClientes.safeParse(req.query); if (!v.success) return res.status(400).json({ mensaje: 'Consulta inválida' }); res.json(await listarClientes(v.data)); });
rutasClientes.post('/', requerirPermiso('clientes.gestionar'), async (req, res) => { const v = esquemaCrearCliente.safeParse(req.body); if (!v.success) return res.status(400).json({ mensaje: 'Datos de cliente inválidos' }); res.status(201).json({ dato: await crearCliente(v.data) }); });
rutasClientes.put('/:id', requerirPermiso('clientes.gestionar'), async (req, res) => { const id = esquemaIdCliente.safeParse(req.params.id); const v = esquemaEditarCliente.safeParse(req.body); if (!id.success || !v.success) return res.status(400).json({ mensaje: 'Datos de cliente inválidos' }); try { res.json({ dato: await editarCliente(id.data, v.data) }); } catch (error) { if (error.codigoPublico === 'NO_ENCONTRADO') return res.status(404).json({ mensaje: error.message }); throw error; } });
