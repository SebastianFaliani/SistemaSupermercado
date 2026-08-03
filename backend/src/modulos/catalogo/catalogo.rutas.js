import { Router } from 'express';

import { requerirAutenticacion } from '../seguridad/autenticacion.middleware.js';
import { requerirPermiso } from '../seguridad/permisos.middleware.js';
import { esquemaCategoria, esquemaConsultaProductos, esquemaProducto } from './catalogo.esquemas.js';
import { crearCategoria, crearProducto, listarCategorias, listarProductos, listarReferencias } from './catalogo.servicio.js';

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

rutasCatalogo.get('/productos', requerirPermiso('productos.ver'), async (solicitud, respuesta) => {
  const validacion = esquemaConsultaProductos.safeParse(solicitud.query);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Consulta inválida' });
  respuesta.json(await listarProductos(validacion.data));
});

rutasCatalogo.post('/productos', requerirPermiso('productos.gestionar'), async (solicitud, respuesta) => {
  const validacion = esquemaProducto.safeParse(solicitud.body);
  if (!validacion.success) return respuesta.status(400).json({ mensaje: 'Datos de producto inválidos', errores: validacion.error.flatten() });
  respuesta.status(201).json({ dato: await crearProducto(validacion.data) });
});
