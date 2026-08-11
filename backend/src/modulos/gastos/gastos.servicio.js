import { baseDatos } from '../../configuracion/base-datos.js';

export async function referenciasGastos() {
  const [[categorias], [proveedores]] = await Promise.all([
    baseDatos.query('SELECT id, nombre FROM categorias_gastos WHERE esta_activa = TRUE ORDER BY nombre'),
    baseDatos.query('SELECT id, COALESCE(nombre_fantasia, razon_social) AS nombre FROM proveedores WHERE esta_activo = TRUE ORDER BY nombre'),
  ]);
  return { categorias, proveedores };
}

export async function crearCategoriaGasto(nombre) {
  const [resultado] = await baseDatos.query('INSERT INTO categorias_gastos (nombre) VALUES (?)', [nombre]);
  return { id: resultado.insertId };
}

export async function listarGastos(consulta) {
  const condiciones = []; const parametros = [];
  if (consulta.buscar) { const patron = `%${consulta.buscar}%`; condiciones.push('(g.concepto LIKE ? OR g.numero_comprobante LIKE ? OR pr.razon_social LIKE ?)'); parametros.push(patron, patron, patron); }
  if (consulta.estado === 'pendientes') condiciones.push("g.estado IN ('pendiente', 'parcial')");
  if (consulta.estado === 'pagados') condiciones.push("g.estado = 'pagado'");
  if (consulta.estado === 'anulados') condiciones.push("g.estado = 'anulado'");
  if (consulta.estado === 'vencidos') condiciones.push("g.estado IN ('pendiente', 'parcial') AND g.fecha_vencimiento < CURRENT_DATE()");
  if (consulta.categoria_id) { condiciones.push('g.categoria_gasto_id = ?'); parametros.push(consulta.categoria_id); }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const offset = (consulta.pagina - 1) * consulta.limite;
  const desde = `FROM gastos g JOIN categorias_gastos cg ON cg.id = g.categoria_gasto_id LEFT JOIN proveedores pr ON pr.id = g.proveedor_id ${donde}`;
  const [[datos], [conteo], [resumen]] = await Promise.all([
    baseDatos.query(`SELECT g.*, cg.nombre AS categoria, COALESCE(pr.nombre_fantasia, pr.razon_social) AS proveedor ${desde} ORDER BY g.fecha_vencimiento, g.id DESC LIMIT ? OFFSET ?`, [...parametros, consulta.limite, offset]),
    baseDatos.query(`SELECT COUNT(*) AS total ${desde}`, parametros),
    baseDatos.query(`SELECT COALESCE(SUM(saldo_pendiente), 0) AS pendiente, COALESCE(SUM(CASE WHEN fecha_vencimiento < CURRENT_DATE() THEN saldo_pendiente ELSE 0 END), 0) AS vencido FROM gastos WHERE estado IN ('pendiente', 'parcial')`),
  ]);
  return { datos, total: Number(conteo[0].total), pendiente: Number(resumen[0].pendiente), vencido: Number(resumen[0].vencido), pagina: consulta.pagina, limite: consulta.limite };
}

export async function crearGasto(datos, usuarioId, origenId = null) {
  const [resultado] = await baseDatos.query(`INSERT INTO gastos (categoria_gasto_id, proveedor_id, usuario_id, concepto, numero_comprobante, fecha_emision, fecha_vencimiento, total, saldo_pendiente, es_recurrente, frecuencia, observaciones, gasto_origen_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [datos.categoria_gasto_id, datos.proveedor_id || null, usuarioId, datos.concepto, datos.numero_comprobante || null, datos.fecha_emision, datos.fecha_vencimiento, datos.total, datos.total, datos.es_recurrente, datos.es_recurrente ? datos.frecuencia : null, datos.observaciones || null, origenId]);
  return { id: resultado.insertId };
}

export async function editarGasto(id, datos) {
  const [resultado] = await baseDatos.query(`UPDATE gastos SET categoria_gasto_id = ?, proveedor_id = ?, concepto = ?, numero_comprobante = ?, fecha_emision = ?, fecha_vencimiento = ?, total = ?, saldo_pendiente = ?, es_recurrente = ?, frecuencia = ?, observaciones = ? WHERE id = ? AND estado = 'pendiente' AND ABS(total - saldo_pendiente) < 0.009`, [datos.categoria_gasto_id, datos.proveedor_id || null, datos.concepto, datos.numero_comprobante || null, datos.fecha_emision, datos.fecha_vencimiento, datos.total, datos.total, datos.es_recurrente, datos.es_recurrente ? datos.frecuencia : null, datos.observaciones || null, id]);
  if (!resultado.affectedRows) { const error = new Error('Sólo se pueden editar gastos pendientes sin pagos'); error.codigoPublico = 'GASTO_NO_EDITABLE'; throw error; }
  return { id };
}

export async function anularGasto(id, usuarioId, motivo) {
  const [resultado] = await baseDatos.query(`UPDATE gastos SET estado = 'anulado', saldo_pendiente = 0, usuario_anulacion_id = ?, motivo_anulacion = ?, fecha_anulacion = CURRENT_TIMESTAMP(3) WHERE id = ? AND estado = 'pendiente' AND ABS(total - saldo_pendiente) < 0.009`, [usuarioId, motivo, id]);
  if (!resultado.affectedRows) { const error = new Error('Sólo se pueden anular gastos pendientes sin pagos'); error.codigoPublico = 'GASTO_NO_ANULABLE'; throw error; }
  return { id };
}

async function obtenerCuentaParaPago(conexion, datos) {
  const [[cuenta]] = await conexion.query(`SELECT ct.id, ct.nombre, ct.tipo, ct.esta_activa, ct.saldo_inicial + COALESCE((SELECT SUM(CASE WHEN mt.tipo = 'ingreso' THEN mt.monto ELSE -mt.monto END) FROM movimientos_tesoreria mt WHERE mt.cuenta_tesoreria_id = ct.id), 0) AS saldo FROM cuentas_tesoreria ct WHERE ct.id = ? FOR UPDATE`, [datos.cuenta_tesoreria_id]);
  if (!cuenta || !cuenta.esta_activa || (datos.medio === 'efectivo' && cuenta.tipo !== 'efectivo')) { const error = new Error('La cuenta de Tesorería no está disponible para este pago'); error.codigoPublico = 'CUENTA_INVALIDA'; throw error; }
  if (Number(cuenta.saldo) + 0.009 < datos.monto) { const error = new Error(`Saldo insuficiente en ${cuenta.nombre}`); error.codigoPublico = 'SALDO_INSUFICIENTE'; throw error; }
  return cuenta;
}

export async function pagarGasto(id, usuarioId, datos) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [[gasto]] = await conexion.query("SELECT concepto, saldo_pendiente, estado FROM gastos WHERE id = ? FOR UPDATE", [id]);
    if (!gasto || !['pendiente', 'parcial'].includes(gasto.estado)) { const error = new Error('El gasto no admite pagos'); error.codigoPublico = 'GASTO_INVALIDO'; throw error; }
    if (datos.monto - Number(gasto.saldo_pendiente) > 0.009) { const error = new Error('El pago no puede superar el saldo'); error.codigoPublico = 'MONTO_INVALIDO'; throw error; }
    let sesionId = null; let cuentaTesoreria = null;
    if (datos.medio === 'efectivo' && datos.origen_efectivo === 'caja') {
      const [[sesion]] = await conexion.query("SELECT id FROM sesiones_caja WHERE usuario_id = ? AND estado = 'abierta' ORDER BY id DESC LIMIT 1 FOR UPDATE", [usuarioId]);
      if (!sesion) { const error = new Error('Debés tener una caja abierta para pagar desde caja'); error.codigoPublico = 'SIN_CAJA'; throw error; }
      sesionId = sesion.id;
    } else cuentaTesoreria = await obtenerCuentaParaPago(conexion, datos);
    const [pago] = await conexion.query('INSERT INTO pagos_gastos (gasto_id, sesion_caja_id, cuenta_tesoreria_id, usuario_id, medio, monto, referencia) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, sesionId, cuentaTesoreria?.id || null, usuarioId, datos.medio, datos.monto, datos.referencia || null]);
    if (cuentaTesoreria) await conexion.query(`INSERT INTO movimientos_tesoreria (cuenta_tesoreria_id, usuario_id, tipo, categoria, concepto, monto, referencia, fecha, pago_gasto_id) VALUES (?, ?, 'egreso', 'gastos', ?, ?, ?, CURRENT_DATE(), ?)`, [cuentaTesoreria.id, usuarioId, `Pago de ${gasto.concepto}`, datos.monto, datos.referencia || `Pago de gasto #${id}`, pago.insertId]);
    await conexion.query(`UPDATE gastos SET estado = CASE WHEN saldo_pendiente - ? <= 0.009 THEN 'pagado' ELSE 'parcial' END, saldo_pendiente = saldo_pendiente - ? WHERE id = ?`, [datos.monto, datos.monto, id]);
    await conexion.commit();
    return { id: pago.insertId };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
}

export async function renovarGasto(id, usuarioId, datos) {
  const [[gasto]] = await baseDatos.query("SELECT id FROM gastos WHERE id = ? AND es_recurrente = TRUE AND estado <> 'anulado'", [id]);
  if (!gasto) { const error = new Error('El gasto no es recurrente o está anulado'); error.codigoPublico = 'NO_RECURRENTE'; throw error; }
  try { return await crearGasto(datos, usuarioId, id); } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') { const conflicto = new Error('Este gasto ya tiene generado su próximo período'); conflicto.codigoPublico = 'PERIODO_YA_GENERADO'; throw conflicto; }
    throw error;
  }
}

export async function detalleGasto(id) {
  const [[gasto]] = await baseDatos.query(`SELECT g.*, cg.nombre AS categoria, COALESCE(pr.nombre_fantasia, pr.razon_social) AS proveedor FROM gastos g JOIN categorias_gastos cg ON cg.id = g.categoria_gasto_id LEFT JOIN proveedores pr ON pr.id = g.proveedor_id WHERE g.id = ?`, [id]);
  if (!gasto) return null;
  const [pagos] = await baseDatos.query(`SELECT pg.*, u.nombre_usuario, c.nombre AS caja, ct.nombre AS cuenta_tesoreria FROM pagos_gastos pg JOIN usuarios u ON u.id = pg.usuario_id LEFT JOIN sesiones_caja sc ON sc.id = pg.sesion_caja_id LEFT JOIN cajas c ON c.id = sc.caja_id LEFT JOIN cuentas_tesoreria ct ON ct.id = pg.cuenta_tesoreria_id WHERE pg.gasto_id = ? ORDER BY pg.id`, [id]);
  return { ...gasto, pagos };
}
