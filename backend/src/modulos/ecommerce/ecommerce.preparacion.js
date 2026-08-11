import { baseDatos } from '../../configuracion/base-datos.js';

const errorPublico = (mensaje) => Object.assign(new Error(mensaje), { codigoPublico: 'CONFLICTO' });
const nulo = (valor) => valor === '' || valor === undefined ? null : valor;

export async function prepararPedido(id, usuarioId, datos) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [[pedido]] = await conexion.query('SELECT estado,acepta_sustituciones FROM pedidos_ecommerce WHERE id=? FOR UPDATE', [id]);
    if (!pedido || !['confirmado', 'en_preparacion'].includes(pedido.estado)) throw errorPublico('El pedido no está disponible para preparación');
    const [[ubicacion]] = await conexion.query("SELECT id FROM ubicaciones_stock WHERE codigo='LOCAL_PRINCIPAL'");
    for (const item of datos.items) {
      const [[detalle]] = await conexion.query('SELECT * FROM pedidos_ecommerce_detalles WHERE id=? AND pedido_id=? FOR UPDATE', [item.detalle_id, id]);
      if (!detalle) throw errorPublico('Detalle de pedido inválido');
      if (item.cantidad_confirmada > Number(detalle.cantidad_solicitada)) throw errorPublico('La cantidad preparada supera la solicitada');
      if (item.producto_sustituto_id && !pedido.acepta_sustituciones) throw errorPublico('El cliente no aceptó sustituciones');
      const productoAnterior = detalle.producto_sustituto_id || detalle.producto_id;
      const productoNuevo = item.producto_sustituto_id || detalle.producto_id;
      let precioUnitario = Number(detalle.precio_unitario); let costoUnitario = Number(detalle.costo_unitario); let descuento = Number(detalle.descuento);
      await conexion.query('UPDATE existencias SET cantidad_reservada=GREATEST(0,cantidad_reservada-?) WHERE producto_id=? AND ubicacion_id=?', [detalle.cantidad_reservada, productoAnterior, ubicacion.id]);
      if (item.cantidad_confirmada > 0) {
        const [[existencia]] = await conexion.query(`SELECT e.cantidad,e.cantidad_reservada,COALESCE(pe.stock_seguridad,0) stock_seguridad FROM existencias e LEFT JOIN productos_ecommerce pe ON pe.producto_id=e.producto_id WHERE e.producto_id=? AND e.ubicacion_id=? FOR UPDATE`, [productoNuevo, ubicacion.id]);
        const disponible = Number(existencia?.cantidad || 0) - Number(existencia?.cantidad_reservada || 0) - Number(existencia?.stock_seguridad || 0);
        if (disponible < item.cantidad_confirmada) throw errorPublico('No hay stock disponible del producto preparado');
        if (item.producto_sustituto_id) { const [[sustituto]] = await conexion.query('SELECT precio_venta,precio_costo FROM productos WHERE id=? AND esta_activo=TRUE', [productoNuevo]); if (!sustituto) throw errorPublico('El producto sustituto no está disponible'); precioUnitario=Number(sustituto.precio_venta); costoUnitario=Number(sustituto.precio_costo); descuento=0; }
        await conexion.query('UPDATE existencias SET cantidad_reservada=cantidad_reservada+? WHERE producto_id=? AND ubicacion_id=?', [item.cantidad_confirmada, productoNuevo, ubicacion.id]);
      }
      const subtotal = Math.max(0, Math.round((precioUnitario * item.cantidad_confirmada - descuento) * 100) / 100);
      await conexion.query("UPDATE pedidos_ecommerce_detalles SET cantidad_confirmada=?,cantidad_reservada=?,producto_sustituto_id=?,precio_unitario=?,costo_unitario=?,descuento=?,subtotal=?,observaciones=?,estado=? WHERE id=?", [item.cantidad_confirmada, item.cantidad_confirmada, nulo(item.producto_sustituto_id), precioUnitario, costoUnitario, descuento, subtotal, nulo(item.observaciones), item.cantidad_confirmada > 0 ? 'preparado' : 'sin_stock', detalle.id]);
    }
    const [[totales]] = await conexion.query('SELECT COALESCE(SUM(subtotal),0) subtotal,COALESCE(SUM(descuento),0) descuento FROM pedidos_ecommerce_detalles WHERE pedido_id=?',[id]);
    const [[pedidoImportes]] = await conexion.query('SELECT costo_envio,estado_pago FROM pedidos_ecommerce WHERE id=?',[id]);
    const total = Math.round((Number(totales.subtotal) + Number(pedidoImportes.costo_envio)) * 100) / 100;
    const [[cobros]] = await conexion.query("SELECT COALESCE(SUM(monto_bruto),0)-(SELECT COALESCE(SUM(r.monto),0) FROM reembolsos_ecommerce r JOIN pagos_ecommerce px ON px.id=r.pago_id WHERE px.pedido_id=? AND r.estado='aprobado') pagado FROM pagos_ecommerce WHERE pedido_id=? AND estado='aprobado'",[id,id]);
    const estadoPago = Number(cobros.pagado) > total + 0.009 ? 'reembolso_pendiente' : pedidoImportes.estado_pago;
    await conexion.query("UPDATE pedidos_ecommerce SET estado='listo',estado_pago=?,subtotal=?,descuento=?,total=?,asignado_usuario_id=? WHERE id=?", [estadoPago,totales.subtotal,totales.descuento,total,usuarioId,id]);
    await conexion.query("INSERT INTO pedidos_ecommerce_estados (pedido_id,estado_anterior,estado_nuevo,usuario_id,comentario) VALUES (?,?,'listo',?,'Preparación confirmada')", [id, pedido.estado, usuarioId]);
    await conexion.commit();
    return { id, estado: 'listo' };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
}
