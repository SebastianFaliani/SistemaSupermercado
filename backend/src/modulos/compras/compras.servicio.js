import { baseDatos } from '../../configuracion/base-datos.js';

export async function listarCompras(consulta) {
  const condiciones = []; const parametros = [];
  if (consulta.buscar) { condiciones.push('(p.razon_social LIKE ? OR p.nombre_fantasia LIKE ? OR oc.id = ?)'); const patron = `%${consulta.buscar}%`; parametros.push(patron, patron, Number(consulta.buscar) || 0); }
  if (consulta.estado !== 'todos') { condiciones.push('oc.estado = ?'); parametros.push(consulta.estado); }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const desde = `FROM ordenes_compra oc JOIN proveedores p ON p.id = oc.proveedor_id JOIN usuarios u ON u.id = oc.usuario_id ${donde}`;
  const offset = (consulta.pagina - 1) * consulta.limite;
  const [[datos], [conteo]] = await Promise.all([
    baseDatos.query(`SELECT oc.id, oc.estado, oc.fecha_esperada, oc.total, oc.fecha_creacion,
      COALESCE(p.nombre_fantasia, p.razon_social) AS proveedor, u.nombre_usuario,
      (SELECT COUNT(*) FROM ordenes_compra_detalles d WHERE d.orden_compra_id = oc.id) AS productos
      ${desde} ORDER BY oc.fecha_creacion DESC LIMIT ? OFFSET ?`, [...parametros, consulta.limite, offset]),
    baseDatos.query(`SELECT COUNT(*) AS total ${desde}`, parametros),
  ]);
  return { datos, total: conteo[0].total, pagina: consulta.pagina, limite: consulta.limite };
}

export async function referenciasCompras() {
  const [[proveedores], [productos]] = await Promise.all([
    baseDatos.query('SELECT id, razon_social, nombre_fantasia FROM proveedores WHERE esta_activo = TRUE ORDER BY COALESCE(nombre_fantasia, razon_social)'),
    baseDatos.query('SELECT id, nombre, precio_costo, es_pesable FROM productos WHERE esta_activo = TRUE ORDER BY nombre'),
  ]);
  return { proveedores, productos };
}

export async function crearCompra(datos, usuarioId) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const total = datos.detalles.reduce((suma, item) => suma + item.cantidad * item.costo_unitario, 0);
    const [orden] = await conexion.query(`INSERT INTO ordenes_compra
      (proveedor_id, usuario_id, fecha_esperada, observaciones, total, modalidad_entrega,
       responsable_retiro, numero_comprobante) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [datos.proveedor_id, usuarioId, datos.fecha_esperada || null, datos.observaciones || null,
      total, datos.modalidad_entrega, datos.responsable_retiro || null, datos.numero_comprobante || null]);
    for (const item of datos.detalles) await conexion.query(`INSERT INTO ordenes_compra_detalles
      (orden_compra_id, producto_id, cantidad, costo_unitario, subtotal) VALUES (?, ?, ?, ?, ?)`,
    [orden.insertId, item.producto_id, item.cantidad, item.costo_unitario, item.cantidad * item.costo_unitario]);
    await conexion.commit(); return { id: orden.insertId, total };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
}

export async function recibirCompra(id, usuarioId) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [[orden]] = await conexion.query('SELECT estado FROM ordenes_compra WHERE id = ? FOR UPDATE', [id]);
    if (!orden) { const error = new Error('No se encontró la compra'); error.codigoPublico = 'NO_ENCONTRADA'; throw error; }
    if (!['borrador', 'enviada'].includes(orden.estado)) { const error = new Error('La compra ya fue recibida o cancelada'); error.codigoPublico = 'ESTADO_INVALIDO'; throw error; }
    const [[ubicacion]] = await conexion.query("SELECT id FROM ubicaciones_stock WHERE codigo = 'LOCAL_PRINCIPAL'");
    const [detalles] = await conexion.query('SELECT producto_id, cantidad, costo_unitario FROM ordenes_compra_detalles WHERE orden_compra_id = ?', [id]);
    const [movimiento] = await conexion.query(`INSERT INTO movimientos_stock
      (ubicacion_id, usuario_id, tipo, motivo, referencia_tipo, referencia_id)
      VALUES (?, ?, 'entrada_compra', ?, 'orden_compra', ?)`, [ubicacion.id, usuarioId, `Recepción de compra #${id}`, id]);
    for (const detalle of detalles) {
      await conexion.query('INSERT IGNORE INTO existencias (producto_id, ubicacion_id, cantidad) VALUES (?, ?, 0)', [detalle.producto_id, ubicacion.id]);
      const [[existencia]] = await conexion.query('SELECT cantidad FROM existencias WHERE producto_id = ? AND ubicacion_id = ? FOR UPDATE', [detalle.producto_id, ubicacion.id]);
      const anterior = Number(existencia.cantidad); const nueva = anterior + Number(detalle.cantidad);
      await conexion.query(`INSERT INTO movimientos_stock_detalles
        (movimiento_stock_id, producto_id, cantidad_anterior, variacion, cantidad_nueva, costo_unitario)
        VALUES (?, ?, ?, ?, ?, ?)`, [movimiento.insertId, detalle.producto_id, anterior, detalle.cantidad, nueva, detalle.costo_unitario]);
      await conexion.query('UPDATE existencias SET cantidad = ? WHERE producto_id = ? AND ubicacion_id = ?', [nueva, detalle.producto_id, ubicacion.id]);
    }
    await conexion.query(`UPDATE ordenes_compra SET estado = 'recibida', recibido_por_usuario_id = ?,
      fecha_recepcion = CURRENT_TIMESTAMP(3) WHERE id = ?`, [usuarioId, id]);
    await conexion.commit(); return { id, productos_recibidos: detalles.length, movimiento_id: movimiento.insertId };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
}
