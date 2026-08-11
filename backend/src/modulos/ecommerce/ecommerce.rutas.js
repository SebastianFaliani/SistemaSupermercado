import { Router } from 'express';

import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { requerirCliente } from './ecommerce.autenticacion.js';
import * as esquemas from './ecommerce.esquemas.js';
import * as servicio from './ecommerce.servicio.js';
import { prepararPedido } from './ecommerce.preparacion.js';

export const rutasEcommerce = Router();
const validar = (esquema, datos, respuesta) => { const resultado = esquema.safeParse(datos); if (!resultado.success) { respuesta.status(400).json({ mensaje: 'Revisá los datos ingresados', errores: resultado.error.flatten().fieldErrors }); return null; } return resultado.data; };
const ejecutar = (accion) => async (solicitud, respuesta, siguiente) => { try { await accion(solicitud, respuesta); } catch (error) { if (error.codigoPublico) return respuesta.status(error.codigoPublico === 'NO_ENCONTRADO' ? 404 : error.codigoPublico === 'ACCESO' ? 401 : 409).json({ mensaje: error.message }); siguiente(error); } };

rutasEcommerce.get('/publico/configuracion', ejecutar(async (_s, r) => r.json({ dato: await servicio.obtenerConfiguracion(true) })));
rutasEcommerce.get('/publico/productos', ejecutar(async (s, r) => { const d = validar(esquemas.esquemaConsultaPublica, s.query, r); if (d) r.json(await servicio.listarProductosOnline(d)); }));
rutasEcommerce.get('/publico/promociones', ejecutar(async (_s, r) => r.json({ datos: (await servicio.listarPromociones()).filter((p) => p.esta_activa) })));
rutasEcommerce.post('/publico/clientes/registro', ejecutar(async (s, r) => { const d = validar(esquemas.esquemaRegistroClienteOnline, s.body, r); if (d) r.status(201).json(await servicio.registrarClienteOnline(d)); }));
rutasEcommerce.post('/publico/clientes/acceso', ejecutar(async (s, r) => { const d = validar(esquemas.esquemaAccesoClienteOnline, s.body, r); if (d) r.json(await servicio.accederClienteOnline(d)); }));
rutasEcommerce.post('/publico/pedidos', ejecutar(async (s, r) => { const d = validar(esquemas.esquemaPedidoPublico, s.body, r); if (d) r.status(201).json({ dato: await servicio.crearPedido(d) }); }));
rutasEcommerce.get('/publico/pedidos/:codigo', ejecutar(async (s, r) => { const dato = await servicio.consultarPedido(s.params.codigo, String(s.query.correo || '')); if (!dato) return r.status(404).json({ mensaje: 'Pedido no encontrado' }); r.json({ dato }); }));

rutasEcommerce.get('/cliente/perfil', requerirCliente, ejecutar(async (s, r) => r.json({ dato: await servicio.perfilClienteOnline(s.clienteId) })));
rutasEcommerce.get('/cliente/pedidos', requerirCliente, ejecutar(async (s, r) => r.json({ datos: await servicio.pedidosCliente(s.clienteId) })));
rutasEcommerce.post('/cliente/direcciones', requerirCliente, ejecutar(async (s, r) => { const d = validar(esquemas.esquemaDireccion, s.body, r); if (d) r.status(201).json({ dato: await servicio.guardarDireccion(s.clienteId, d) }); }));

rutasEcommerce.use('/admin', requerirAutenticacion);
rutasEcommerce.get('/admin/configuracion', requerirPermiso('ecommerce.ver'), ejecutar(async (_s, r) => r.json({ dato: await servicio.obtenerConfiguracion() })));
rutasEcommerce.put('/admin/configuracion', requerirPermiso('ecommerce.gestionar'), ejecutar(async (s, r) => { const d = validar(esquemas.esquemaConfiguracion, s.body, r); if (d) r.json({ dato: await servicio.actualizarConfiguracion(d) }); }));
for (const [recurso, esquema, guardar] of [['zonas', esquemas.esquemaZona, servicio.guardarZona], ['franjas', esquemas.esquemaFranja, servicio.guardarFranja]]) {
  rutasEcommerce.post(`/admin/${recurso}`, requerirPermiso('ecommerce.gestionar'), ejecutar(async (s, r) => { const d = validar(esquema, s.body, r); if (d) r.status(201).json({ dato: await guardar(null, d) }); }));
  rutasEcommerce.put(`/admin/${recurso}/:id`, requerirPermiso('ecommerce.gestionar'), ejecutar(async (s, r) => { const d = validar(esquema, s.body, r); if (d) r.json({ dato: await guardar(Number(s.params.id), d) }); }));
}
rutasEcommerce.get('/admin/productos', requerirPermiso('ecommerce.ver'), ejecutar(async (s, r) => { const d = validar(esquemas.esquemaConsultaAdmin, s.query, r); if (d) r.json(await servicio.listarProductosOnline(d, true)); }));
rutasEcommerce.put('/admin/productos/:id', requerirPermiso('ecommerce.gestionar'), ejecutar(async (s, r) => { const d = validar(esquemas.esquemaProductoOnline, s.body, r); if (d) r.json({ dato: await servicio.actualizarProductoOnline(Number(s.params.id), d) }); }));
rutasEcommerce.get('/admin/promociones', requerirPermiso('ecommerce.ver'), ejecutar(async (_s, r) => r.json({ datos: await servicio.listarPromociones() })));
rutasEcommerce.post('/admin/promociones', requerirPermiso('ecommerce.gestionar'), ejecutar(async (s, r) => { const d = validar(esquemas.esquemaPromocion, s.body, r); if (d) r.status(201).json({ dato: await servicio.guardarPromocion(null, d) }); }));
rutasEcommerce.put('/admin/promociones/:id', requerirPermiso('ecommerce.gestionar'), ejecutar(async (s, r) => { const d = validar(esquemas.esquemaPromocion, s.body, r); if (d) r.json({ dato: await servicio.guardarPromocion(Number(s.params.id), d) }); }));
rutasEcommerce.get('/admin/pedidos', requerirPermiso('ecommerce.ver'), ejecutar(async (s, r) => { const d = validar(esquemas.esquemaConsultaPedidos, s.query, r); if (d) r.json(await servicio.listarPedidos(d)); }));
rutasEcommerce.get('/admin/pedidos/:id', requerirPermiso('ecommerce.ver'), ejecutar(async (s, r) => { const dato = await servicio.obtenerPedido(Number(s.params.id)); if (!dato) return r.status(404).json({ mensaje: 'Pedido no encontrado' }); r.json({ dato }); }));
rutasEcommerce.put('/admin/pedidos/:id/estado', requerirPermiso('ecommerce.pedidos'), ejecutar(async (s, r) => { const d = validar(esquemas.esquemaCambioPedido, s.body, r); if (d) r.json({ dato: await servicio.cambiarEstadoPedido(Number(s.params.id), s.usuario.id, d) }); }));
rutasEcommerce.put('/admin/pedidos/:id/preparacion', requerirPermiso('ecommerce.pedidos'), ejecutar(async (s, r) => { const d = validar(esquemas.esquemaPreparacion, s.body, r); if (d) r.json({ dato: await prepararPedido(Number(s.params.id), s.usuario.id, d) }); }));
rutasEcommerce.post('/admin/pedidos/:id/pagos', requerirPermiso('ecommerce.pagos'), ejecutar(async (s, r) => { const d = validar(esquemas.esquemaPagoPedido, s.body, r); if (d) r.status(201).json({ dato: await servicio.confirmarPagoPedido(Number(s.params.id), s.usuario.id, d) }); }));
rutasEcommerce.post('/admin/pedidos/:id/entrega', requerirPermiso('ecommerce.pedidos'), ejecutar(async (s, r) => r.json({ dato: await servicio.entregarPedido(Number(s.params.id), s.usuario.id) })));
rutasEcommerce.post('/admin/pagos/:id/reembolsos', requerirPermiso('ecommerce.pagos'), ejecutar(async (s, r) => { const d = validar(esquemas.esquemaReembolso, s.body, r); if (d) r.status(201).json({ dato: await servicio.reembolsarPago(Number(s.params.id), s.usuario.id, d) }); }));
