import { baseDatos } from '../../configuracion/base-datos.js';

export const calcularPrecioVenta = (costo, margen) =>
  Math.round((Number(costo) * (1 + Number(margen) / 100)) / 10) * 10;

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
    baseDatos.query(`SELECT p.id, p.nombre, p.precio_costo, p.es_pesable,
      (SELECT pcb.codigo_barra FROM productos_codigos_barra pcb
       WHERE pcb.producto_id = p.id ORDER BY pcb.es_principal DESC, pcb.id LIMIT 1) AS codigo_barra
      FROM productos p WHERE p.esta_activo = TRUE ORDER BY p.nombre`),
  ]);
  return { proveedores, productos };
}

export async function obtenerCompra(id) {
  const [ordenes] = await baseDatos.query(`SELECT oc.*, COALESCE(p.nombre_fantasia, p.razon_social) AS proveedor
    FROM ordenes_compra oc JOIN proveedores p ON p.id = oc.proveedor_id WHERE oc.id = ?`, [id]);
  if (!ordenes[0]) return null;
  const [detalles] = await baseDatos.query(`SELECT d.producto_id, p.nombre, pcb.codigo_barra,
    p.es_pesable, d.cantidad, d.cantidad_recibida, d.costo_unitario, d.subtotal
    FROM ordenes_compra_detalles d JOIN productos p ON p.id = d.producto_id
    LEFT JOIN productos_codigos_barra pcb ON pcb.producto_id = p.id AND pcb.es_principal = TRUE
    WHERE d.orden_compra_id = ? ORDER BY d.id`, [id]);
  return { ...ordenes[0], detalles };
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

export async function editarCompra(id, datos) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [[orden]] = await conexion.query('SELECT estado FROM ordenes_compra WHERE id = ? FOR UPDATE', [id]);
    if (!orden) { const error = new Error('No se encontró la compra'); error.codigoPublico = 'NO_ENCONTRADA'; throw error; }
    if (orden.estado !== 'borrador') { const error = new Error('Solo se pueden editar compras en borrador'); error.codigoPublico = 'ESTADO_INVALIDO'; throw error; }
    const total = datos.detalles.reduce((suma, item) => suma + item.cantidad * item.costo_unitario, 0);
    await conexion.query(`UPDATE ordenes_compra SET proveedor_id = ?, fecha_esperada = ?,
      observaciones = ?, total = ?, modalidad_entrega = ?, responsable_retiro = ?,
      numero_comprobante = ? WHERE id = ?`, [datos.proveedor_id, datos.fecha_esperada || null,
      datos.observaciones || null, total, datos.modalidad_entrega,
      datos.responsable_retiro || null, datos.numero_comprobante || null, id]);
    await conexion.query('DELETE FROM ordenes_compra_detalles WHERE orden_compra_id = ?', [id]);
    for (const item of datos.detalles) await conexion.query(`INSERT INTO ordenes_compra_detalles
      (orden_compra_id, producto_id, cantidad, costo_unitario, subtotal) VALUES (?, ?, ?, ?, ?)`,
    [id, item.producto_id, item.cantidad, item.costo_unitario, item.cantidad * item.costo_unitario]);
    await conexion.commit(); return { id, total };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
}

export async function cambiarEstadoCompra(id, accion) {
  const destino = accion === 'enviar' ? 'enviada' : 'cancelada';
  const permitidos = accion === 'enviar' ? ['borrador'] : ['borrador', 'enviada'];
  const marcadores = permitidos.map(() => '?').join(', ');
  const [resultado] = await baseDatos.query(`UPDATE ordenes_compra SET estado = ?
    WHERE id = ? AND estado IN (${marcadores})`, [destino, id, ...permitidos]);
  if (!resultado.affectedRows) { const error = new Error(`La compra no se puede ${accion}`); error.codigoPublico = 'ESTADO_INVALIDO'; throw error; }
  return { id, estado: destino };
}

export async function recibirCompra(id, usuarioId, datos) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [[orden]] = await conexion.query('SELECT estado FROM ordenes_compra WHERE id = ? FOR UPDATE', [id]);
    if (!orden) { const error = new Error('No se encontró la compra'); error.codigoPublico = 'NO_ENCONTRADA'; throw error; }
    if (!['enviada', 'parcial'].includes(orden.estado)) { const error = new Error('La compra debe estar enviada y tener cantidades pendientes'); error.codigoPublico = 'ESTADO_INVALIDO'; throw error; }
    const [[ubicacion]] = await conexion.query("SELECT id FROM ubicaciones_stock WHERE codigo = 'LOCAL_PRINCIPAL'");
    const detalles = [];
    for (const recibido of datos.detalles) {
      const [[detalle]] = await conexion.query(`SELECT producto_id, cantidad, cantidad_recibida,
        costo_unitario FROM ordenes_compra_detalles WHERE orden_compra_id = ? AND producto_id = ? FOR UPDATE`, [id, recibido.producto_id]);
      if (!detalle || Number(detalle.cantidad) - Number(detalle.cantidad_recibida) < recibido.cantidad) {
        const error = new Error('Una cantidad recibida supera lo pendiente'); error.codigoPublico = 'CANTIDAD_INVALIDA'; throw error;
      }
      detalles.push({ ...detalle, cantidad_recepcion: recibido.cantidad });
    }
    const [movimiento] = await conexion.query(`INSERT INTO movimientos_stock
      (ubicacion_id, usuario_id, tipo, motivo, referencia_tipo, referencia_id)
      VALUES (?, ?, 'entrada_compra', ?, 'orden_compra', ?)`, [ubicacion.id, usuarioId, `Recepción de compra #${id}`, id]);
    for (const detalle of detalles) {
      const [[producto]] = await conexion.query(`SELECT p.precio_costo, p.precio_venta,
        p.porcentaje_margen, p.precio_venta_editado_manualmente,
        c.porcentaje_margen_predeterminado
        FROM productos p JOIN categorias c ON c.id = p.categoria_id
        WHERE p.id = ? FOR UPDATE`, [detalle.producto_id]);
      const costoAnterior = Number(producto.precio_costo);
      const costoNuevo = Number(detalle.costo_unitario);
      if (Math.abs(costoAnterior - costoNuevo) > 0.009) {
        const margen = Number(producto.porcentaje_margen ?? producto.porcentaje_margen_predeterminado);
        const ventaAnterior = Number(producto.precio_venta);
        const ventaNueva = producto.precio_venta_editado_manualmente
          ? ventaAnterior
          : calcularPrecioVenta(costoNuevo, margen);
        await conexion.query('UPDATE productos SET precio_costo = ?, precio_venta = ? WHERE id = ?',
          [costoNuevo, ventaNueva, detalle.producto_id]);
        await conexion.query(`INSERT INTO historiales_precios
          (producto_id, usuario_id, precio_costo_anterior, precio_costo_nuevo,
           precio_venta_anterior, precio_venta_nuevo, porcentaje_margen, origen)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'recepcion_compra')`,
        [detalle.producto_id, usuarioId, costoAnterior, costoNuevo,
          ventaAnterior, ventaNueva, margen]);
      }
      await conexion.query('INSERT IGNORE INTO existencias (producto_id, ubicacion_id, cantidad) VALUES (?, ?, 0)', [detalle.producto_id, ubicacion.id]);
      const [[existencia]] = await conexion.query('SELECT cantidad FROM existencias WHERE producto_id = ? AND ubicacion_id = ? FOR UPDATE', [detalle.producto_id, ubicacion.id]);
      const anterior = Number(existencia.cantidad); const nueva = anterior + Number(detalle.cantidad_recepcion);
      await conexion.query(`INSERT INTO movimientos_stock_detalles
        (movimiento_stock_id, producto_id, cantidad_anterior, variacion, cantidad_nueva, costo_unitario)
        VALUES (?, ?, ?, ?, ?, ?)`, [movimiento.insertId, detalle.producto_id, anterior, detalle.cantidad_recepcion, nueva, detalle.costo_unitario]);
      await conexion.query('UPDATE existencias SET cantidad = ? WHERE producto_id = ? AND ubicacion_id = ?', [nueva, detalle.producto_id, ubicacion.id]);
      await conexion.query(`UPDATE ordenes_compra_detalles SET cantidad_recibida = cantidad_recibida + ?
        WHERE orden_compra_id = ? AND producto_id = ?`, [detalle.cantidad_recepcion, id, detalle.producto_id]);
    }
    const [[pendientes]] = await conexion.query(`SELECT COUNT(*) AS cantidad FROM ordenes_compra_detalles
      WHERE orden_compra_id = ? AND cantidad_recibida < cantidad`, [id]);
    const estado = pendientes.cantidad ? 'parcial' : 'recibida';
    await conexion.query(`UPDATE ordenes_compra SET estado = ?, recibido_por_usuario_id = ?,
      fecha_recepcion = IF(? = 'recibida', CURRENT_TIMESTAMP(3), fecha_recepcion) WHERE id = ?`, [estado, usuarioId, estado, id]);
    await conexion.commit(); return { id, productos_recibidos: detalles.length, movimiento_id: movimiento.insertId };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
}
