import { Router } from 'express';

import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { esquemaCategoria, esquemaConsultaProductos, esquemaMarca, esquemaProducto } from './catalogo.esquemas.js';
import { actualizarProducto, crearCategoria, crearMarca, crearProducto, listarCategorias, listarProductos, listarReferencias, obtenerProducto } from './catalogo.servicio.js';

export const rutasCatalogo = Router();
rutasCatalogo.use(requerirAutenticacion);

rutasCatalogo.get('/categorias', requerirPermiso('productos.ver'), async (_solicitud, respuesta) => {
  respuesta.json({ datos: await listarCategorias() });
});

rutasCatalogo.post('/categorias', requerirPermiso('productos.gestionar'), async (solicitud, respuesta) => {
  const validacion = esquemaCategoria.safeParse(solicitud.body);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Datos de categoría inválidos', errores: validacion.error.flatten() });
  respuesta.status(201).json({ dato: await crearCategoria(validacion.data) });
});

rutasCatalogo.get('/referencias', requerirPermiso('productos.ver'), async (_solicitud, respuesta) => {
  respuesta.json(await listarReferencias());
});

rutasCatalogo.post('/marcas', requerirPermiso('productos.gestionar'), async (solicitud, respuesta) => {
  const validacion = esquemaMarca.safeParse(solicitud.body);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Datos de marca inválidos' });
  respuesta.status(201).json({ dato: await crearMarca(validacion.data) });
});

rutasCatalogo.get('/productos', requerirPermiso('productos.ver'), async (solicitud, respuesta) => {
  const validacion = esquemaConsultaProductos.safeParse(solicitud.query);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Consulta inválida' });
  respuesta.json(await listarProductos(validacion.data));
});

rutasCatalogo.get('/productos/:id', requerirPermiso('productos.ver'), async (solicitud, respuesta) => {
  const productoId = Number(solicitud.params.id);
  if (!Number.isInteger(productoId) || productoId <= 0) return respuesta.status(400).json({ mensaje: 'Producto inválido' });
  const producto = await obtenerProducto(productoId);
  if (!producto) return respuesta.status(404).json({ mensaje: 'Producto no encontrado' });
  respuesta.json({ dato: producto });
});

rutasCatalogo.post('/productos', requerirPermiso('productos.gestionar'), async (solicitud, respuesta) => {
  const validacion = esquemaProducto.safeParse(solicitud.body);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Datos de producto inválidos', errores: validacion.error.flatten() });
  respuesta.status(201).json({ dato: await crearProducto(validacion.data) });
});

rutasCatalogo.put('/productos/:id', requerirPermiso('productos.gestionar'), async (solicitud, respuesta) => {
  const productoId = Number(solicitud.params.id);
  if (!Number.isInteger(productoId) || productoId <= 0) return respuesta.status(400).json({ mensaje: 'Producto inválido' });
  const validacion = esquemaProducto.safeParse(solicitud.body);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Datos de producto inválidos', errores: validacion.error.flatten() });
  const producto = await actualizarProducto(productoId, validacion.data, solicitud.usuario.id);
  if (!producto) return respuesta.status(404).json({ mensaje: 'Producto no encontrado' });
  respuesta.json({ dato: producto });
});
