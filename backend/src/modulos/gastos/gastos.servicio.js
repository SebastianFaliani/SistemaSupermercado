import { baseDatos } from '../../configuracion/base-datos.js';

export async function referenciasGastos() { const [[categorias], [proveedores]] = await Promise.all([baseDatos.query('SELECT id, nombre FROM categorias_gastos WHERE esta_activa = TRUE ORDER BY nombre'), baseDatos.query('SELECT id, COALESCE(nombre_fantasia, razon_social) AS nombre FROM proveedores WHERE esta_activo = TRUE ORDER BY nombre')]); return { categorias, proveedores }; }
export async function crearCategoriaGasto(nombre) { const [r] = await baseDatos.query('INSERT INTO categorias_gastos (nombre) VALUES (?)', [nombre]); return { id: r.insertId }; }
export async function listarGastos(consulta) {
  const condiciones = []; const parametros = [];
  if (consulta.buscar) { const p = `%${consulta.buscar}%`; condiciones.push('(g.concepto LIKE ? OR g.numero_comprobante LIKE ? OR pr.razon_social LIKE ?)'); parametros.push(p, p, p); }
  if (consulta.estado === 'pendientes') condiciones.push("g.estado IN ('pendiente', 'parcial')");
  if (consulta.estado === 'pagados') condiciones.push("g.estado = 'pagado'");
  if (consulta.estado === 'vencidos') condiciones.push("g.estado IN ('pendiente', 'parcial') AND g.fecha_vencimiento < CURRENT_DATE()");
  if (consulta.categoria_id) { condiciones.push('g.categoria_gasto_id = ?'); parametros.push(consulta.categoria_id); }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''; const offset = (consulta.pagina - 1) * consulta.limite;
  const desde = `FROM gastos g JOIN categorias_gastos cg ON cg.id = g.categoria_gasto_id LEFT JOIN proveedores pr ON pr.id = g.proveedor_id ${donde}`;
  const [[datos], [conteo], [resumen]] = await Promise.all([
    baseDatos.query(`SELECT g.*, cg.nombre AS categoria, COALESCE(pr.nombre_fantasia, pr.razon_social) AS proveedor ${desde} ORDER BY g.fecha_vencimiento, g.id DESC LIMIT ? OFFSET ?`, [...parametros, consulta.limite, offset]),
    baseDatos.query(`SELECT COUNT(*) AS total ${desde}`, parametros),
    baseDatos.query(`SELECT COALESCE(SUM(saldo_pendiente), 0) AS pendiente, COALESCE(SUM(CASE WHEN fecha_vencimiento < CURRENT_DATE() THEN saldo_pendiente ELSE 0 END), 0) AS vencido FROM gastos WHERE estado IN ('pendiente', 'parcial')`),
  ]);
  return { datos, total: Number(conteo[0].total), pendiente: Number(resumen[0].pendiente), vencido: Number(resumen[0].vencido), pagina: consulta.pagina, limite: consulta.limite };
}
export async function crearGasto(datos, usuarioId, origenId = null) { const [r] = await baseDatos.query(`INSERT INTO gastos (categoria_gasto_id, proveedor_id, usuario_id, concepto, numero_comprobante, fecha_emision, fecha_vencimiento, total, saldo_pendiente, es_recurrente, frecuencia, observaciones, gasto_origen_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [datos.categoria_gasto_id, datos.proveedor_id || null, usuarioId, datos.concepto, datos.numero_comprobante || null, datos.fecha_emision, datos.fecha_vencimiento, datos.total, datos.total, datos.es_recurrente, datos.es_recurrente ? datos.frecuencia : null, datos.observaciones || null, origenId]); return { id: r.insertId }; }
export async function pagarGasto(id, usuarioId, datos) {
  const conexion = await baseDatos.getConnection(); try { await conexion.beginTransaction();
    const [[gasto]] = await conexion.query("SELECT saldo_pendiente, estado FROM gastos WHERE id = ? FOR UPDATE", [id]);
    if (!gasto || !['pendiente', 'parcial'].includes(gasto.estado)) { const e = new Error('El gasto no admite pagos'); e.codigoPublico = 'GASTO_INVALIDO'; throw e; }
    if (datos.monto - Number(gasto.saldo_pendiente) > 0.009) { const e = new Error('El pago no puede superar el saldo'); e.codigoPublico = 'MONTO_INVALIDO'; throw e; }
    let sesionId = null; if (datos.medio === 'efectivo') { const [[s]] = await conexion.query("SELECT id FROM sesiones_caja WHERE usuario_id = ? AND estado = 'abierta' ORDER BY id DESC LIMIT 1 FOR UPDATE", [usuarioId]); if (!s) { const e = new Error('Debés tener una caja abierta para pagar en efectivo'); e.codigoPublico = 'SIN_CAJA'; throw e; } sesionId = s.id; }
    const [pago] = await conexion.query('INSERT INTO pagos_gastos (gasto_id, sesion_caja_id, usuario_id, medio, monto, referencia) VALUES (?, ?, ?, ?, ?, ?)', [id, sesionId, usuarioId, datos.medio, datos.monto, datos.referencia || null]);
    await conexion.query(`UPDATE gastos SET saldo_pendiente = saldo_pendiente - ?, estado = CASE WHEN saldo_pendiente - ? <= 0.009 THEN 'pagado' ELSE 'parcial' END WHERE id = ?`, [datos.monto, datos.monto, id]);
    await conexion.commit(); return { id: pago.insertId };
  } catch (e) { await conexion.rollback(); throw e; } finally { conexion.release(); }
}
const diasFrecuencia = { semanal: 7, mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };
export async function renovarGasto(id, usuarioId) { const [[g]] = await baseDatos.query('SELECT * FROM gastos WHERE id = ? AND es_recurrente = TRUE', [id]); if (!g) { const e = new Error('El gasto no es recurrente'); e.codigoPublico = 'NO_RECURRENTE'; throw e; } const emision = new Date(g.fecha_emision); const vencimiento = new Date(g.fecha_vencimiento); if (g.frecuencia === 'semanal') { emision.setDate(emision.getDate() + 7); vencimiento.setDate(vencimiento.getDate() + 7); } else { emision.setMonth(emision.getMonth() + diasFrecuencia[g.frecuencia]); vencimiento.setMonth(vencimiento.getMonth() + diasFrecuencia[g.frecuencia]); } return crearGasto({ ...g, fecha_emision: emision.toISOString().slice(0, 10), fecha_vencimiento: vencimiento.toISOString().slice(0, 10), numero_comprobante: null }, usuarioId, id); }
export async function detalleGasto(id) { const [[gasto]] = await baseDatos.query(`SELECT g.*, cg.nombre AS categoria, COALESCE(pr.nombre_fantasia, pr.razon_social) AS proveedor FROM gastos g JOIN categorias_gastos cg ON cg.id = g.categoria_gasto_id LEFT JOIN proveedores pr ON pr.id = g.proveedor_id WHERE g.id = ?`, [id]); if (!gasto) return null; const [pagos] = await baseDatos.query(`SELECT pg.*, u.nombre_usuario, c.nombre AS caja FROM pagos_gastos pg JOIN usuarios u ON u.id = pg.usuario_id LEFT JOIN sesiones_caja sc ON sc.id = pg.sesion_caja_id LEFT JOIN cajas c ON c.id = sc.caja_id WHERE pg.gasto_id = ? ORDER BY pg.id`, [id]); return { ...gasto, pagos }; }
