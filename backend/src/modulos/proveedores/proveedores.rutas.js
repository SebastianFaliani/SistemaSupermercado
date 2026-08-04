import { Router } from 'express';
import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { esquemaConsultaProveedores, esquemaCrearProveedor, esquemaEditarProveedor, esquemaFacturaProveedor, esquemaIdProveedor, esquemaPagoProveedor } from './proveedores.esquemas.js';
import { crearFacturaProveedor, crearProveedor, editarProveedor, listarProveedores, obtenerCuentaProveedor, obtenerPagoProveedor, registrarPagoProveedor } from './proveedores.servicio.js';

export const rutasProveedores = Router();
rutasProveedores.use(requerirAutenticacion);

rutasProveedores.get('/', requerirPermiso('compras.ver'), async (solicitud, respuesta) => {
  const validacion = esquemaConsultaProveedores.safeParse(solicitud.query);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Consulta inválida' });
  respuesta.json(await listarProveedores(validacion.data));
});

rutasProveedores.post('/', requerirPermiso('compras.gestionar'), async (solicitud, respuesta) => {
  const validacion = esquemaCrearProveedor.safeParse(solicitud.body);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Datos de proveedor inválidos', errores: validacion.error.flatten() });
  respuesta.status(201).json({ dato: await crearProveedor(validacion.data) });
});

rutasProveedores.put('/:id', requerirPermiso('compras.gestionar'), async (solicitud, respuesta) => {
  const id = esquemaIdProveedor.safeParse(solicitud.params.id);
  const datos = esquemaEditarProveedor.safeParse(solicitud.body);
  if (!id.success || !datos.success) return respuesta.status(400).json({ mensaje: 'Datos de proveedor inválidos' });
  try {
    respuesta.json({ dato: await editarProveedor(id.data, datos.data) });
  } catch (error) {
    if (error.codigoPublico === 'NO_ENCONTRADO') return respuesta.status(404).json({ mensaje: error.message });
    throw error;
  }
});
rutasProveedores.get('/:id/cuenta', requerirPermiso('cuentas_proveedores.ver'), async (req, res) => { const id = esquemaIdProveedor.safeParse(req.params.id); if (!id.success) return res.status(400).json({ mensaje: 'Proveedor inválido' }); const dato = await obtenerCuentaProveedor(id.data); if (!dato) return res.status(404).json({ mensaje: 'No se encontró el proveedor' }); res.json({ dato }); });
rutasProveedores.post('/:id/facturas', requerirPermiso('cuentas_proveedores.gestionar'), async (req, res) => { const id = esquemaIdProveedor.safeParse(req.params.id); const datos = esquemaFacturaProveedor.safeParse(req.body); if (!id.success || !datos.success) return res.status(400).json({ mensaje: 'Datos de factura inválidos' }); try { res.status(201).json({ dato: await crearFacturaProveedor(id.data, req.usuario.id, datos.data) }); } catch (error) { if (error.codigoPublico) return res.status(409).json({ mensaje: error.message }); throw error; } });
rutasProveedores.post('/:id/pagos', requerirPermiso('cuentas_proveedores.gestionar'), async (req, res) => { const id = esquemaIdProveedor.safeParse(req.params.id); const datos = esquemaPagoProveedor.safeParse(req.body); if (!id.success || !datos.success) return res.status(400).json({ mensaje: 'Datos de pago inválidos' }); try { res.status(201).json({ dato: await registrarPagoProveedor(id.data, req.usuario.id, datos.data) }); } catch (error) { if (error.codigoPublico) return res.status(409).json({ mensaje: error.message }); throw error; } });
rutasProveedores.get('/pagos/:id', requerirPermiso('cuentas_proveedores.ver'), async (req, res) => { const id = esquemaIdProveedor.safeParse(req.params.id); if (!id.success) return res.status(400).json({ mensaje: 'Pago inválido' }); const dato = await obtenerPagoProveedor(id.data); if (!dato) return res.status(404).json({ mensaje: 'No se encontró el pago' }); res.json({ dato }); });
