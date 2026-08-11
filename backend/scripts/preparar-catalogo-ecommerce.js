import { baseDatos } from '../src/configuracion/base-datos.js';

const limitePorCategoria = 12;
try {
  const [productos] = await baseDatos.query(`SELECT id,categoria_id,ROW_NUMBER() OVER (PARTITION BY categoria_id ORDER BY nombre) posicion FROM productos p WHERE p.esta_activo=TRUE AND p.precio_venta>0 AND EXISTS (SELECT 1 FROM existencias e JOIN ubicaciones_stock u ON u.id=e.ubicacion_id AND u.codigo='LOCAL_PRINCIPAL' WHERE e.producto_id=p.id AND e.cantidad-e.cantidad_reservada>0)`);
  const seleccionados = productos.filter((p) => Number(p.posicion) <= limitePorCategoria);
  for (const [indice, producto] of seleccionados.entries()) {
    await baseDatos.query(`INSERT INTO productos_ecommerce (producto_id,esta_publicado,stock_seguridad,es_destacado,orden_destacado) VALUES (?,TRUE,0,?,?) ON DUPLICATE KEY UPDATE esta_publicado=TRUE`, [producto.id, indice < 8, indice]);
  }
  console.log(`${seleccionados.length} productos preparados para la prueba manual. La tienda continúa respetando su estado actual de habilitación.`);
} finally { await baseDatos.end(); }
