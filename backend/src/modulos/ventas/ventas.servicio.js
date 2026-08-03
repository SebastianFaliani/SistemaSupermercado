import { baseDatos } from '../../configuracion/base-datos.js';

export async function obtenerSesion(usuarioId) {
  const [filas] = await baseDatos.query(`SELECT sc.id, sc.monto_inicial, sc.fecha_apertura,
    c.nombre AS caja FROM sesiones_caja sc JOIN cajas c ON c.id = sc.caja_id
    WHERE sc.usuario_id = ? AND sc.estado = 'abierta' ORDER BY sc.id DESC LIMIT 1`, [usuarioId]);
  return filas[0] || null;
}

export async function listarCajasDisponibles() {
  const [filas] = await baseDatos.query(`SELECT c.id, c.codigo, c.nombre
    FROM cajas c LEFT JOIN sesiones_caja sc ON sc.caja_id = c.id AND sc.estado = 'abierta'
    WHERE c.esta_activa = TRUE AND sc.id IS NULL ORDER BY c.nombre`);
  return filas;
}

export async function resumenCaja(usuarioId) {
  const sesion = await obtenerSesion(usuarioId);
  if (!sesion) return null;
  const [pagos] = await baseDatos.query(`SELECT vp.medio, COALESCE(SUM(vp.monto), 0) AS total
    FROM ventas_pagos vp JOIN ventas v ON v.id = vp.venta_id
    WHERE v.sesion_caja_id = ? AND v.estado = 'completada' GROUP BY vp.medio`, [sesion.id]);
  const porMedio = Object.fromEntries(pagos.map((pago) => [pago.medio, Number(pago.total)]));
  const ventas = Object.values(porMedio).reduce((suma, importe) => suma + importe, 0);
  return { ...sesion, pagos: porMedio, total_ventas: ventas,
    efectivo_esperado: Number(sesion.monto_inicial) + (porMedio.efectivo || 0) };
}

export async function cerrarCaja(usuarioId, montoContado) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [[sesion]] = await conexion.query(`SELECT id, monto_inicial FROM sesiones_caja
      WHERE usuario_id = ? AND estado = 'abierta' ORDER BY id DESC LIMIT 1 FOR UPDATE`, [usuarioId]);
    if (!sesion) { const error = new Error('No tenés una caja abierta'); error.codigoPublico = 'SIN_CAJA'; throw error; }
    const [[pagos]] = await conexion.query(`SELECT COALESCE(SUM(vp.monto), 0) AS efectivo
      FROM ventas_pagos vp JOIN ventas v ON v.id = vp.venta_id
      WHERE v.sesion_caja_id = ? AND v.estado = 'completada' AND vp.medio = 'efectivo'`, [sesion.id]);
    const esperado = Number(sesion.monto_inicial) + Number(pagos.efectivo);
    const diferencia = montoContado - esperado;
    await conexion.query(`UPDATE sesiones_caja SET estado = 'cerrada', monto_contado_cierre = ?,
      diferencia_cierre = ?, fecha_cierre = CURRENT_TIMESTAMP(3) WHERE id = ?`,
    [montoContado, diferencia, sesion.id]);
    await conexion.commit(); return { id: sesion.id, efectivo_esperado: esperado,
      monto_contado: montoContado, diferencia };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
}

export async function abrirCaja(usuarioId, cajaId, montoInicial) {
  if (await obtenerSesion(usuarioId)) { const error = new Error('Ya tenés una caja abierta'); error.codigoPublico = 'CAJA_ABIERTA'; throw error; }
  const [[caja]] = await baseDatos.query(`SELECT c.id FROM cajas c
    LEFT JOIN sesiones_caja sc ON sc.caja_id = c.id AND sc.estado = 'abierta'
    WHERE c.id = ? AND c.esta_activa = TRUE AND sc.id IS NULL`, [cajaId]);
  if (!caja) { const error = new Error('La caja seleccionada ya no está disponible'); error.codigoPublico = 'CAJA_NO_DISPONIBLE'; throw error; }
  try {
    const [resultado] = await baseDatos.query('INSERT INTO sesiones_caja (caja_id, usuario_id, monto_inicial) VALUES (?, ?, ?)', [caja.id, usuarioId, montoInicial]);
    return { id: resultado.insertId };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') { const publico = new Error('La caja seleccionada acaba de ser ocupada'); publico.codigoPublico = 'CAJA_NO_DISPONIBLE'; throw publico; }
    throw error;
  }
}

export async function referenciasVenta() {
  const [productos] = await baseDatos.query(`SELECT p.id, p.nombre, p.precio_venta, p.es_pesable,
    COALESCE(e.cantidad, 0) AS stock,
    (SELECT pcb.codigo_barra FROM productos_codigos_barra pcb WHERE pcb.producto_id = p.id
     ORDER BY pcb.es_principal DESC, pcb.id LIMIT 1) AS codigo_barra
    FROM productos p JOIN ubicaciones_stock u ON u.codigo = 'LOCAL_PRINCIPAL'
    LEFT JOIN existencias e ON e.producto_id = p.id AND e.ubicacion_id = u.id
    WHERE p.esta_activo = TRUE ORDER BY p.nombre`);
  return productos;
}

export async function crearVenta(usuarioId, datos) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [[sesion]] = await conexion.query("SELECT id FROM sesiones_caja WHERE usuario_id = ? AND estado = 'abierta' ORDER BY id DESC LIMIT 1 FOR UPDATE", [usuarioId]);
    if (!sesion) { const error = new Error('Debés abrir la caja antes de vender'); error.codigoPublico = 'SIN_CAJA'; throw error; }
    const [[ubicacion]] = await conexion.query("SELECT id FROM ubicaciones_stock WHERE codigo = 'LOCAL_PRINCIPAL'");
    const detalles = []; let total = 0;
    for (const item of datos.detalles) {
      const [[producto]] = await conexion.query(`SELECT p.nombre, p.precio_venta, p.es_pesable,
        COALESCE(e.cantidad, 0) AS stock FROM productos p LEFT JOIN existencias e
        ON e.producto_id = p.id AND e.ubicacion_id = ? WHERE p.id = ? AND p.esta_activo = TRUE FOR UPDATE`, [ubicacion.id, item.producto_id]);
      if (!producto || Number(producto.stock) < item.cantidad) { const error = new Error(`Stock insuficiente para ${producto?.nombre || 'un producto'}`); error.codigoPublico = 'STOCK_INSUFICIENTE'; throw error; }
      if (!producto.es_pesable && !Number.isInteger(item.cantidad)) { const error = new Error(`La cantidad de ${producto.nombre} debe ser entera`); error.codigoPublico = 'CANTIDAD_ENTERA'; throw error; }
      const subtotal = item.cantidad * Number(producto.precio_venta); total += subtotal;
      detalles.push({ ...item, ...producto, subtotal });
    }
    const totalPagos = datos.pagos.reduce((suma, pago) => suma + pago.monto, 0);
    if (Math.abs(totalPagos - total) > 0.009) { const error = new Error('Los pagos deben coincidir con el total de la venta'); error.codigoPublico = 'PAGO_INVALIDO'; throw error; }
    const [venta] = await conexion.query('INSERT INTO ventas (sesion_caja_id, usuario_id, total) VALUES (?, ?, ?)', [sesion.id, usuarioId, total]);
    const [movimiento] = await conexion.query(`INSERT INTO movimientos_stock
      (ubicacion_id, usuario_id, tipo, motivo, referencia_tipo, referencia_id)
      VALUES (?, ?, 'salida_venta', ?, 'venta', ?)`, [ubicacion.id, usuarioId, `Venta #${venta.insertId}`, venta.insertId]);
    for (const detalle of detalles) {
      const anterior = Number(detalle.stock); const nueva = anterior - detalle.cantidad;
      await conexion.query('INSERT INTO ventas_detalles (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)', [venta.insertId, detalle.producto_id, detalle.cantidad, detalle.precio_venta, detalle.subtotal]);
      await conexion.query('UPDATE existencias SET cantidad = ? WHERE producto_id = ? AND ubicacion_id = ?', [nueva, detalle.producto_id, ubicacion.id]);
      await conexion.query(`INSERT INTO movimientos_stock_detalles
        (movimiento_stock_id, producto_id, cantidad_anterior, variacion, cantidad_nueva)
        VALUES (?, ?, ?, ?, ?)`, [movimiento.insertId, detalle.producto_id, anterior, -detalle.cantidad, nueva]);
    }
    for (const pago of datos.pagos) await conexion.query('INSERT INTO ventas_pagos (venta_id, medio, monto) VALUES (?, ?, ?)', [venta.insertId, pago.medio, pago.monto]);
    await conexion.commit(); return { id: venta.insertId, total };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
}
