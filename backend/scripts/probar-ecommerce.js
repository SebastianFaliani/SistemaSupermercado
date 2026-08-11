import { baseDatos } from '../src/configuracion/base-datos.js';
import { cambiarEstadoPedido, confirmarPagoPedido, crearPedido, entregarPedido, obtenerPedido } from '../src/modulos/ecommerce/ecommerce.servicio.js';
import { prepararPedido } from '../src/modulos/ecommerce/ecommerce.preparacion.js';

let pedidoId; let ventaId; let pagoId; let movimientoTesoreriaId; let producto; let configuracion; let publicacion;
const resultados = [];
try {
  [[configuracion]] = await baseDatos.query('SELECT * FROM configuracion_ecommerce WHERE id=1');
  [[producto]] = await baseDatos.query(`SELECT p.id,p.precio_venta,e.cantidad,e.cantidad_reservada,e.ubicacion_id FROM productos p JOIN existencias e ON e.producto_id=p.id JOIN ubicaciones_stock u ON u.id=e.ubicacion_id AND u.codigo='LOCAL_PRINCIPAL' WHERE p.esta_activo=TRUE AND e.cantidad-e.cantidad_reservada>=2 ORDER BY p.id LIMIT 1`);
  if (!producto) throw new Error('No hay un producto con stock para ejecutar la prueba');
  [[publicacion]] = await baseDatos.query('SELECT * FROM productos_ecommerce WHERE producto_id=?', [producto.id]);
  const [[usuario]] = await baseDatos.query(`SELECT u.id FROM usuarios u JOIN usuarios_roles ur ON ur.usuario_id=u.id JOIN roles r ON r.id=ur.rol_id WHERE r.nombre='administrador' AND u.esta_activo=TRUE ORDER BY u.id LIMIT 1`);
  const [[cuenta]] = await baseDatos.query('SELECT id FROM cuentas_tesoreria WHERE esta_activa=TRUE ORDER BY id LIMIT 1');
  if (!usuario || !cuenta) throw new Error('La prueba necesita un administrador y una cuenta de Tesorería activa');
  await baseDatos.query("UPDATE configuracion_ecommerce SET esta_activa=TRUE,pedido_minimo=0,permite_retiro=TRUE,permite_efectivo=TRUE WHERE id=1");
  await baseDatos.query(`INSERT INTO productos_ecommerce (producto_id,esta_publicado,stock_seguridad) VALUES (?,TRUE,0) ON DUPLICATE KEY UPDATE esta_publicado=TRUE,stock_seguridad=0`, [producto.id]);
  const creado = await crearPedido({ nombre_cliente:'Prueba automática', correo_cliente:'ecommerce.prueba@la91.local', telefono_cliente:'2210000000', modalidad_entrega:'retiro', medio_pago:'efectivo', direccion:null, franja_entrega_id:null, fecha_entrega:null, acepta_sustituciones:true, observaciones:'PRUEBA_AUTOMATICA_ECOMMERCE', cupon_codigo:null, cliente_token:null, items:[{ producto_id:producto.id, cantidad:1 }] });
  pedidoId = creado.id; resultados.push('pedido creado');
  let pedido = await obtenerPedido(pedidoId);
  const pago = await confirmarPagoPedido(pedidoId, usuario.id, { proveedor:'efectivo', monto_bruto:Number(pedido.total), comision:0, referencia_externa:`TEST-${pedidoId}`, cuenta_tesoreria_id:cuenta.id, idempotencia:`prueba-ecommerce-${pedidoId}` });
  pagoId=pago.id; movimientoTesoreriaId=pago.movimiento_tesoreria_id; resultados.push('cobro reflejado en Tesorería');
  pedido = await obtenerPedido(pedidoId);
  await cambiarEstadoPedido(pedidoId, usuario.id, { estado:'en_preparacion', comentario:'Prueba automática' });
  await prepararPedido(pedidoId, usuario.id, { items:pedido.detalles.map((d)=>({ detalle_id:d.id, cantidad_confirmada:Number(d.cantidad_solicitada), producto_sustituto_id:null, observaciones:'' })) });
  resultados.push('reserva y preparación verificadas');
  const entrega = await entregarPedido(pedidoId, usuario.id); ventaId=entrega.venta_id; resultados.push('venta online y salida de stock registradas');
  const [[validacion]] = await baseDatos.query(`SELECT p.estado,p.estado_pago,v.canal,e.cantidad,e.cantidad_reservada FROM pedidos_ecommerce p JOIN ventas v ON v.id=p.venta_id JOIN existencias e ON e.producto_id=? AND e.ubicacion_id=? WHERE p.id=?`, [producto.id,producto.ubicacion_id,pedidoId]);
  if (validacion.estado!=='entregado'||validacion.estado_pago!=='aprobado'||validacion.canal!=='ecommerce'||Number(validacion.cantidad)!==Number(producto.cantidad)-1||Number(validacion.cantidad_reservada)!==Number(producto.cantidad_reservada)) throw new Error('La validación final no coincide');
  resultados.push('integridad final verificada');
  console.log(`E-commerce OK: ${resultados.join(' · ')}`);
} finally {
  if (pedidoId) {
    const [[movStock]] = await baseDatos.query("SELECT id FROM movimientos_stock WHERE referencia_tipo='pedido_ecommerce' AND referencia_id=?", [pedidoId]);
    await baseDatos.query('UPDATE pedidos_ecommerce SET venta_id=NULL WHERE id=?', [pedidoId]);
    if (ventaId) { await baseDatos.query('DELETE FROM ventas_pagos WHERE venta_id=?',[ventaId]); await baseDatos.query('DELETE FROM ventas_detalles WHERE venta_id=?',[ventaId]); await baseDatos.query('DELETE FROM ventas WHERE id=?',[ventaId]); }
    if (movStock) { await baseDatos.query('DELETE FROM movimientos_stock_detalles WHERE movimiento_stock_id=?',[movStock.id]); await baseDatos.query('DELETE FROM movimientos_stock WHERE id=?',[movStock.id]); }
    if (pagoId) await baseDatos.query('DELETE FROM reembolsos_ecommerce WHERE pago_id=?',[pagoId]);
    await baseDatos.query('DELETE FROM pagos_ecommerce WHERE pedido_id=?',[pedidoId]);
    if (movimientoTesoreriaId) await baseDatos.query('DELETE FROM movimientos_tesoreria WHERE id=?',[movimientoTesoreriaId]);
    await baseDatos.query('DELETE FROM pedidos_ecommerce_estados WHERE pedido_id=?',[pedidoId]); await baseDatos.query('DELETE FROM pedidos_ecommerce_detalles WHERE pedido_id=?',[pedidoId]); await baseDatos.query('DELETE FROM pedidos_ecommerce WHERE id=?',[pedidoId]);
  }
  if (producto) await baseDatos.query('UPDATE existencias SET cantidad=?,cantidad_reservada=? WHERE producto_id=? AND ubicacion_id=?',[producto.cantidad,producto.cantidad_reservada,producto.id,producto.ubicacion_id]);
  if (producto) { if (publicacion) await baseDatos.query('UPDATE productos_ecommerce SET esta_publicado=?,nombre_online=?,descripcion_online=?,precio_online=?,stock_seguridad=?,cantidad_maxima_pedido=?,permite_sustitucion=?,permite_retiro=?,permite_envio=?,es_destacado=?,orden_destacado=? WHERE producto_id=?',[publicacion.esta_publicado,publicacion.nombre_online,publicacion.descripcion_online,publicacion.precio_online,publicacion.stock_seguridad,publicacion.cantidad_maxima_pedido,publicacion.permite_sustitucion,publicacion.permite_retiro,publicacion.permite_envio,publicacion.es_destacado,publicacion.orden_destacado,producto.id]); else await baseDatos.query('DELETE FROM productos_ecommerce WHERE producto_id=?',[producto.id]); }
  if (configuracion) await baseDatos.query('UPDATE configuracion_ecommerce SET esta_activa=?,pedido_minimo=?,permite_retiro=?,permite_efectivo=? WHERE id=1',[configuracion.esta_activa,configuracion.pedido_minimo,configuracion.permite_retiro,configuracion.permite_efectivo]);
  await baseDatos.end();
}
