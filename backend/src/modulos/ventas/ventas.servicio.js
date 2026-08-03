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
  const [ajustes] = await baseDatos.query(`SELECT dvp.medio,
    SUM(IF(dvp.tipo = 'cobro', dvp.monto, -dvp.monto)) AS total
    FROM devoluciones_ventas_pagos dvp JOIN devoluciones_ventas dv ON dv.id = dvp.devolucion_id
    WHERE dv.sesion_caja_id = ? GROUP BY dvp.medio`, [sesion.id]);
  const porMedio = Object.fromEntries(pagos.map((pago) => [pago.medio, Number(pago.total)]));
  const ajustesPorMedio = Object.fromEntries(ajustes.map((ajuste) => [ajuste.medio, Number(ajuste.total)]));
  const ventas = Object.values(porMedio).reduce((suma, importe) => suma + importe, 0);
  return { ...sesion, pagos: porMedio, ajustes: ajustesPorMedio, total_ventas: ventas,
    efectivo_esperado: Number(sesion.monto_inicial) + (porMedio.efectivo || 0)
      + (ajustesPorMedio.efectivo || 0) };
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
    const [[ajustes]] = await conexion.query(`SELECT COALESCE(SUM(
      IF(dvp.tipo = 'cobro', dvp.monto, -dvp.monto)), 0) AS efectivo
      FROM devoluciones_ventas_pagos dvp JOIN devoluciones_ventas dv ON dv.id = dvp.devolucion_id
      WHERE dv.sesion_caja_id = ? AND dvp.medio = 'efectivo'`, [sesion.id]);
    const esperado = Number(sesion.monto_inicial) + Number(pagos.efectivo) + Number(ajustes.efectivo);
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

function condicionesVentas(consulta, usuarioId) {
  const condiciones = []; const parametros = [];
  if (usuarioId) { condiciones.push('v.usuario_id = ?'); parametros.push(usuarioId); }
  if (consulta.buscar) {
    condiciones.push(`(v.id = ? OR u.nombre_usuario LIKE ? OR EXISTS (
      SELECT 1 FROM ventas_detalles vd JOIN productos p ON p.id = vd.producto_id
      WHERE vd.venta_id = v.id AND p.nombre LIKE ?))`);
    const patron = `%${consulta.buscar}%`; parametros.push(Number(consulta.buscar) || 0, patron, patron);
  }
  if (consulta.fecha_desde) { condiciones.push('v.fecha_creacion >= ?'); parametros.push(`${consulta.fecha_desde} 00:00:00`); }
  if (consulta.fecha_hasta) { condiciones.push('v.fecha_creacion < DATE_ADD(?, INTERVAL 1 DAY)'); parametros.push(`${consulta.fecha_hasta} 00:00:00`); }
  return { donde: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', parametros };
}

export async function listarVentas(consulta, usuarioId = null) {
  const { donde, parametros } = condicionesVentas(consulta, usuarioId);
  const desde = `FROM ventas v JOIN usuarios u ON u.id = v.usuario_id
    JOIN sesiones_caja sc ON sc.id = v.sesion_caja_id JOIN cajas c ON c.id = sc.caja_id ${donde}`;
  const offset = (consulta.pagina - 1) * consulta.limite;
  const [[datos], [resumen], [pagos]] = await Promise.all([
    baseDatos.query(`SELECT v.id, v.fecha_creacion, v.estado, v.total, u.nombre_usuario,
      c.nombre AS caja, (SELECT COUNT(*) FROM ventas_detalles vd WHERE vd.venta_id = v.id) AS productos
      ${desde} ORDER BY v.fecha_creacion DESC LIMIT ? OFFSET ?`, [...parametros, consulta.limite, offset]),
    baseDatos.query(`SELECT COUNT(*) AS total,
      COALESCE(SUM(IF(v.estado = 'completada', v.total, 0)), 0) AS facturacion ${desde}`, parametros),
    baseDatos.query(`SELECT vp.medio, COALESCE(SUM(vp.monto), 0) AS total
      FROM ventas_pagos vp JOIN ventas v ON v.id = vp.venta_id
      JOIN usuarios u ON u.id = v.usuario_id JOIN sesiones_caja sc ON sc.id = v.sesion_caja_id
      JOIN cajas c ON c.id = sc.caja_id ${donde ? `${donde} AND` : 'WHERE'} v.estado = 'completada'
      GROUP BY vp.medio`, parametros),
  ]);
  return { datos, total: resumen[0].total, facturacion: Number(resumen[0].facturacion),
    pagos: Object.fromEntries(pagos.map((pago) => [pago.medio, Number(pago.total)])),
    pagina: consulta.pagina, limite: consulta.limite };
}

export async function obtenerVenta(id, usuarioId = null) {
  const parametros = [id]; const restriccion = usuarioId ? 'AND v.usuario_id = ?' : '';
  if (usuarioId) parametros.push(usuarioId);
  const [ventas] = await baseDatos.query(`SELECT v.id, v.fecha_creacion, v.estado, v.total,
    v.fecha_anulacion, v.motivo_anulacion,
    u.nombre_usuario, c.nombre AS caja FROM ventas v JOIN usuarios u ON u.id = v.usuario_id
    JOIN sesiones_caja sc ON sc.id = v.sesion_caja_id JOIN cajas c ON c.id = sc.caja_id
    WHERE v.id = ? ${restriccion}`, parametros);
  if (!ventas[0]) return null;
  const [[detalles], [pagos], [devoluciones]] = await Promise.all([
    baseDatos.query(`SELECT vd.producto_id, p.nombre, p.es_pesable, pcb.codigo_barra,
      vd.cantidad, vd.precio_unitario, vd.subtotal,
      COALESCE((SELECT SUM(dvd.cantidad) FROM devoluciones_ventas_detalles dvd
        JOIN devoluciones_ventas dv ON dv.id = dvd.devolucion_id
        WHERE dv.venta_id = vd.venta_id AND dvd.producto_id = vd.producto_id
          AND dvd.tipo = 'devuelto'), 0) AS cantidad_devuelta
      FROM ventas_detalles vd JOIN productos p ON p.id = vd.producto_id
      LEFT JOIN productos_codigos_barra pcb ON pcb.producto_id = p.id AND pcb.es_principal = TRUE
      WHERE vd.venta_id = ? ORDER BY vd.id`, [id]),
    baseDatos.query('SELECT medio, monto FROM ventas_pagos WHERE venta_id = ? ORDER BY id', [id]),
    baseDatos.query(`SELECT dv.id, dv.fecha_creacion, dv.motivo, dv.total_devuelto,
      dv.total_reemplazo, dv.diferencia, u.nombre_usuario FROM devoluciones_ventas dv
      JOIN usuarios u ON u.id = dv.usuario_id WHERE dv.venta_id = ? ORDER BY dv.id`, [id]),
  ]);
  return { ...ventas[0], detalles, pagos, devoluciones };
}

export async function anularVenta(id, usuarioId, motivo) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [[venta]] = await conexion.query(`SELECT v.estado, v.sesion_caja_id, sc.estado AS estado_caja
      FROM ventas v JOIN sesiones_caja sc ON sc.id = v.sesion_caja_id WHERE v.id = ? FOR UPDATE`, [id]);
    if (!venta) { const error = new Error('No se encontró la venta'); error.codigoPublico = 'NO_ENCONTRADA'; throw error; }
    if (venta.estado !== 'completada') { const error = new Error('La venta ya está anulada'); error.codigoPublico = 'ESTADO_INVALIDO'; throw error; }
    if (venta.estado_caja !== 'abierta') { const error = new Error('No se puede anular una venta de una caja cerrada'); error.codigoPublico = 'CAJA_CERRADA'; throw error; }
    const [[ubicacion]] = await conexion.query("SELECT id FROM ubicaciones_stock WHERE codigo = 'LOCAL_PRINCIPAL'");
    const [detalles] = await conexion.query('SELECT producto_id, cantidad FROM ventas_detalles WHERE venta_id = ?', [id]);
    const [movimiento] = await conexion.query(`INSERT INTO movimientos_stock
      (ubicacion_id, usuario_id, tipo, motivo, referencia_tipo, referencia_id)
      VALUES (?, ?, 'entrada_anulacion_venta', ?, 'venta_anulada', ?)`, [ubicacion.id, usuarioId, motivo, id]);
    for (const detalle of detalles) {
      const [[existencia]] = await conexion.query(`SELECT cantidad FROM existencias
        WHERE producto_id = ? AND ubicacion_id = ? FOR UPDATE`, [detalle.producto_id, ubicacion.id]);
      const anterior = Number(existencia.cantidad); const nueva = anterior + Number(detalle.cantidad);
      await conexion.query('UPDATE existencias SET cantidad = ? WHERE producto_id = ? AND ubicacion_id = ?', [nueva, detalle.producto_id, ubicacion.id]);
      await conexion.query(`INSERT INTO movimientos_stock_detalles
        (movimiento_stock_id, producto_id, cantidad_anterior, variacion, cantidad_nueva)
        VALUES (?, ?, ?, ?, ?)`, [movimiento.insertId, detalle.producto_id, anterior, detalle.cantidad, nueva]);
    }
    await conexion.query(`UPDATE ventas SET estado = 'anulada', anulada_por_usuario_id = ?,
      motivo_anulacion = ?, fecha_anulacion = CURRENT_TIMESTAMP(3) WHERE id = ?`, [usuarioId, motivo, id]);
    await conexion.commit(); return { id, productos_reintegrados: detalles.length, movimiento_id: movimiento.insertId };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
}

export async function crearDevolucion(ventaId, usuarioId, datos) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [[venta]] = await conexion.query("SELECT estado FROM ventas WHERE id = ? FOR UPDATE", [ventaId]);
    if (!venta || venta.estado !== 'completada') { const error = new Error('La venta no admite devoluciones'); error.codigoPublico = 'VENTA_INVALIDA'; throw error; }
    const [[sesion]] = await conexion.query("SELECT id FROM sesiones_caja WHERE usuario_id = ? AND estado = 'abierta' ORDER BY id DESC LIMIT 1 FOR UPDATE", [usuarioId]);
    if (!sesion) { const error = new Error('Debés tener una caja abierta para realizar el cambio'); error.codigoPublico = 'SIN_CAJA'; throw error; }
    const [[ubicacion]] = await conexion.query("SELECT id FROM ubicaciones_stock WHERE codigo = 'LOCAL_PRINCIPAL'");
    const devueltos = []; let totalDevuelto = 0;
    for (const item of datos.devueltos) {
      const [[vendido]] = await conexion.query(`SELECT vd.cantidad, vd.precio_unitario, p.nombre,
        COALESCE((SELECT SUM(dvd.cantidad) FROM devoluciones_ventas_detalles dvd
          JOIN devoluciones_ventas dv ON dv.id = dvd.devolucion_id
          WHERE dv.venta_id = ? AND dvd.producto_id = ? AND dvd.tipo = 'devuelto'), 0) AS ya_devuelto
        FROM ventas_detalles vd JOIN productos p ON p.id = vd.producto_id
        WHERE vd.venta_id = ? AND vd.producto_id = ?`, [ventaId, item.producto_id, ventaId, item.producto_id]);
      if (!vendido || Number(vendido.cantidad) - Number(vendido.ya_devuelto) < item.cantidad) {
        const error = new Error(`La cantidad devuelta de ${vendido?.nombre || 'un producto'} supera la vendida`); error.codigoPublico = 'CANTIDAD_INVALIDA'; throw error;
      }
      const subtotal = item.cantidad * Number(vendido.precio_unitario); totalDevuelto += subtotal;
      devueltos.push({ ...item, nombre: vendido.nombre, precio_unitario: Number(vendido.precio_unitario), subtotal });
    }
    const reemplazos = []; let totalReemplazo = 0;
    for (const item of datos.reemplazos) {
      const [[producto]] = await conexion.query(`SELECT p.nombre, p.precio_venta, p.es_pesable,
        COALESCE(e.cantidad, 0) AS stock FROM productos p LEFT JOIN existencias e
        ON e.producto_id = p.id AND e.ubicacion_id = ? WHERE p.id = ? AND p.esta_activo = TRUE FOR UPDATE`, [ubicacion.id, item.producto_id]);
      if (!producto || Number(producto.stock) < item.cantidad) { const error = new Error(`Stock insuficiente para ${producto?.nombre || 'un producto'}`); error.codigoPublico = 'STOCK_INSUFICIENTE'; throw error; }
      if (!producto.es_pesable && !Number.isInteger(item.cantidad)) { const error = new Error(`La cantidad de ${producto.nombre} debe ser entera`); error.codigoPublico = 'CANTIDAD_ENTERA'; throw error; }
      const subtotal = item.cantidad * Number(producto.precio_venta); totalReemplazo += subtotal;
      reemplazos.push({ ...item, ...producto, precio_unitario: Number(producto.precio_venta), subtotal });
    }
    const diferencia = totalReemplazo - totalDevuelto;
    if (Math.abs(diferencia) > 0.009 && !datos.medio) { const error = new Error('Debe indicarse el medio para cobrar o reintegrar la diferencia'); error.codigoPublico = 'MEDIO_REQUERIDO'; throw error; }
    const [devolucion] = await conexion.query(`INSERT INTO devoluciones_ventas
      (venta_id, sesion_caja_id, usuario_id, motivo, total_devuelto, total_reemplazo, diferencia)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [ventaId, sesion.id, usuarioId, datos.motivo, totalDevuelto, totalReemplazo, diferencia]);
    const cambiosStock = [];
    for (const item of devueltos) {
      await conexion.query(`INSERT INTO devoluciones_ventas_detalles
        (devolucion_id, producto_id, tipo, cantidad, precio_unitario, subtotal, reintegra_stock)
        VALUES (?, ?, 'devuelto', ?, ?, ?, ?)`, [devolucion.insertId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal, item.reintegra_stock]);
      if (item.reintegra_stock) cambiosStock.push({ producto_id: item.producto_id, variacion: item.cantidad });
    }
    for (const item of reemplazos) {
      await conexion.query(`INSERT INTO devoluciones_ventas_detalles
        (devolucion_id, producto_id, tipo, cantidad, precio_unitario, subtotal, reintegra_stock)
        VALUES (?, ?, 'reemplazo', ?, ?, ?, FALSE)`, [devolucion.insertId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal]);
      cambiosStock.push({ producto_id: item.producto_id, variacion: -item.cantidad });
    }
    if (cambiosStock.length) {
      const [movimiento] = await conexion.query(`INSERT INTO movimientos_stock
        (ubicacion_id, usuario_id, tipo, motivo, referencia_tipo, referencia_id)
        VALUES (?, ?, 'cambio_devolucion', ?, 'devolucion_venta', ?)`, [ubicacion.id, usuarioId, datos.motivo, devolucion.insertId]);
      for (const cambio of cambiosStock) {
        const [[existencia]] = await conexion.query('SELECT cantidad FROM existencias WHERE producto_id = ? AND ubicacion_id = ? FOR UPDATE', [cambio.producto_id, ubicacion.id]);
        const anterior = Number(existencia.cantidad); const nueva = anterior + cambio.variacion;
        await conexion.query('UPDATE existencias SET cantidad = ? WHERE producto_id = ? AND ubicacion_id = ?', [nueva, cambio.producto_id, ubicacion.id]);
        await conexion.query(`INSERT INTO movimientos_stock_detalles
          (movimiento_stock_id, producto_id, cantidad_anterior, variacion, cantidad_nueva)
          VALUES (?, ?, ?, ?, ?)`, [movimiento.insertId, cambio.producto_id, anterior, cambio.variacion, nueva]);
      }
    }
    if (Math.abs(diferencia) > 0.009) await conexion.query(`INSERT INTO devoluciones_ventas_pagos
      (devolucion_id, tipo, medio, monto) VALUES (?, ?, ?, ?)`, [devolucion.insertId, diferencia > 0 ? 'cobro' : 'reintegro', datos.medio, Math.abs(diferencia)]);
    await conexion.commit(); return { id: devolucion.insertId, diferencia };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
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
