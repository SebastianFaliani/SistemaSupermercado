import { baseDatos } from '../../configuracion/base-datos.js';

const campos = ['nombre', 'tipo_documento', 'numero_documento', 'telefono', 'correo_electronico', 'direccion', 'observaciones', 'credito_habilitado', 'limite_credito', 'dias_vencimiento'];
const valor = (datos, campo) => datos[campo] === '' || datos[campo] === undefined ? null : datos[campo];
export async function listarClientes(consulta) {
  const condiciones = []; const parametros = [];
  if (consulta.buscar) { const patron = `%${consulta.buscar}%`; condiciones.push('(nombre LIKE ? OR numero_documento LIKE ? OR telefono LIKE ? OR correo_electronico LIKE ?)'); parametros.push(patron, patron, patron, patron); }
  if (consulta.estado !== 'todos') { condiciones.push('esta_activo = ?'); parametros.push(consulta.estado === 'activos'); }
  if (consulta.cuenta === 'deudores') condiciones.push("EXISTS (SELECT 1 FROM ventas v WHERE v.cliente_id = clientes.id AND v.estado = 'completada' AND v.saldo_pendiente > 0)");
  if (consulta.cuenta === 'vencidas') condiciones.push("EXISTS (SELECT 1 FROM ventas v WHERE v.cliente_id = clientes.id AND v.estado = 'completada' AND v.saldo_pendiente > 0 AND v.fecha_vencimiento < CURRENT_DATE())");
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''; const desplazamiento = (consulta.pagina - 1) * consulta.limite;
  const [[datos], [conteo]] = await Promise.all([baseDatos.query(`SELECT id, ${campos.join(', ')}, esta_activo, fecha_creacion,
    (SELECT COALESCE(SUM(v.saldo_pendiente), 0) FROM ventas v WHERE v.cliente_id = clientes.id AND v.estado = 'completada') AS saldo,
    (SELECT COALESCE(SUM(v.saldo_pendiente), 0) FROM ventas v WHERE v.cliente_id = clientes.id AND v.estado = 'completada' AND v.fecha_vencimiento < CURRENT_DATE()) AS vencido
    FROM clientes ${donde} ORDER BY nombre LIMIT ? OFFSET ?`, [...parametros, consulta.limite, desplazamiento]), baseDatos.query(`SELECT COUNT(*) AS total FROM clientes ${donde}`, parametros)]);
  return { datos, total: Number(conteo[0].total), pagina: consulta.pagina, limite: consulta.limite };
}
export async function crearCliente(datos) { const [resultado] = await baseDatos.query(`INSERT INTO clientes (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`, campos.map((campo) => valor(datos, campo))); return { id: resultado.insertId }; }
export async function editarCliente(id, datos) { const [resultado] = await baseDatos.query(`UPDATE clientes SET ${campos.map((campo) => `${campo} = ?`).join(', ')}, esta_activo = ? WHERE id = ?`, [...campos.map((campo) => valor(datos, campo)), datos.esta_activo, id]); if (!resultado.affectedRows) { const error = new Error('No se encontró el cliente'); error.codigoPublico = 'NO_ENCONTRADO'; throw error; } return { id }; }

export async function obtenerCuentaCliente(id) {
  const [[cliente]] = await baseDatos.query(`SELECT c.id, c.nombre, c.tipo_documento, c.numero_documento,
    c.credito_habilitado, c.limite_credito, c.dias_vencimiento, c.esta_activo,
    COALESCE(SUM(v.saldo_pendiente), 0) AS saldo,
    COALESCE(SUM(CASE WHEN v.saldo_pendiente > 0 AND v.fecha_vencimiento < CURRENT_DATE() THEN v.saldo_pendiente ELSE 0 END), 0) AS vencido
    FROM clientes c LEFT JOIN ventas v ON v.cliente_id = c.id AND v.estado = 'completada'
    WHERE c.id = ? GROUP BY c.id`, [id]);
  if (!cliente) return null;
  const [[ventas], [movimientos]] = await Promise.all([
    baseDatos.query(`SELECT id, total, saldo_pendiente, fecha_vencimiento, fecha_creacion,
      CASE WHEN saldo_pendiente = 0 THEN 'pagada' WHEN fecha_vencimiento < CURRENT_DATE() THEN 'vencida' ELSE 'pendiente' END AS estado_cuenta
      FROM ventas WHERE cliente_id = ? AND estado = 'completada' AND saldo_pendiente > 0 ORDER BY fecha_vencimiento, id`, [id]),
    baseDatos.query(`SELECT m.id, m.tipo, m.debe, m.haber, m.descripcion, m.referencia_tipo,
      m.referencia_id, m.fecha_vencimiento, m.fecha_creacion, u.nombre_usuario
      FROM movimientos_cuenta_clientes m JOIN usuarios u ON u.id = m.usuario_id
      WHERE m.cliente_id = ? ORDER BY m.fecha_creacion DESC, m.id DESC LIMIT 200`, [id]),
  ]);
  return { ...cliente, saldo: Number(cliente.saldo), vencido: Number(cliente.vencido), disponible: Math.max(0, Number(cliente.limite_credito) - Number(cliente.saldo)), ventas, movimientos };
}

export async function registrarCobranza(clienteId, usuarioId, datos) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [[sesion]] = await conexion.query("SELECT id FROM sesiones_caja WHERE usuario_id = ? AND estado = 'abierta' ORDER BY id DESC LIMIT 1 FOR UPDATE", [usuarioId]);
    if (!sesion) { const error = new Error('Debés tener una caja abierta para registrar la cobranza'); error.codigoPublico = 'SIN_CAJA'; throw error; }
    const [[cliente]] = await conexion.query('SELECT id, nombre FROM clientes WHERE id = ? FOR UPDATE', [clienteId]);
    if (!cliente) { const error = new Error('No se encontró el cliente'); error.codigoPublico = 'NO_ENCONTRADO'; throw error; }
    const [deudas] = await conexion.query("SELECT id, saldo_pendiente FROM ventas WHERE cliente_id = ? AND estado = 'completada' AND saldo_pendiente > 0 ORDER BY fecha_vencimiento, id FOR UPDATE", [clienteId]);
    const saldo = deudas.reduce((suma, venta) => suma + Number(venta.saldo_pendiente), 0);
    if (datos.monto - saldo > 0.009) { const error = new Error('La cobranza no puede superar la deuda del cliente'); error.codigoPublico = 'MONTO_INVALIDO'; throw error; }
    const [cobranza] = await conexion.query('INSERT INTO cobranzas_clientes (cliente_id, sesion_caja_id, usuario_id, medio, monto, observaciones) VALUES (?, ?, ?, ?, ?, ?)', [clienteId, sesion.id, usuarioId, datos.medio, datos.monto, datos.observaciones || null]);
    let restante = Number(datos.monto);
    for (const deuda of deudas) {
      if (restante <= 0.009) break;
      const aplicado = Math.min(restante, Number(deuda.saldo_pendiente));
      await conexion.query('INSERT INTO cobranzas_clientes_aplicaciones (cobranza_id, venta_id, monto) VALUES (?, ?, ?)', [cobranza.insertId, deuda.id, aplicado]);
      await conexion.query('UPDATE ventas SET saldo_pendiente = saldo_pendiente - ? WHERE id = ?', [aplicado, deuda.id]);
      restante -= aplicado;
    }
    await conexion.query(`INSERT INTO movimientos_cuenta_clientes (cliente_id, usuario_id, tipo, haber, referencia_tipo, referencia_id, descripcion)
      VALUES (?, ?, 'cobranza', ?, 'cobranza', ?, ?)`, [clienteId, usuarioId, datos.monto, cobranza.insertId, `Cobranza #${cobranza.insertId}`]);
    await conexion.commit(); return { id: cobranza.insertId, monto: datos.monto, saldo_anterior: saldo, saldo_nuevo: saldo - datos.monto };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
}

export async function obtenerCobranza(id, usuarioId = null) {
  const parametros = [id]; const restriccion = usuarioId ? 'AND cc.usuario_id = ?' : ''; if (usuarioId) parametros.push(usuarioId);
  const [[cobranza]] = await baseDatos.query(`SELECT cc.id, cc.medio, cc.monto, cc.observaciones, cc.fecha_creacion,
    c.nombre AS cliente, c.tipo_documento, c.numero_documento, u.nombre_usuario, ca.nombre AS caja
    FROM cobranzas_clientes cc JOIN clientes c ON c.id = cc.cliente_id JOIN usuarios u ON u.id = cc.usuario_id
    JOIN sesiones_caja sc ON sc.id = cc.sesion_caja_id JOIN cajas ca ON ca.id = sc.caja_id WHERE cc.id = ? ${restriccion}`, parametros);
  if (!cobranza) return null;
  const [aplicaciones] = await baseDatos.query('SELECT venta_id, monto FROM cobranzas_clientes_aplicaciones WHERE cobranza_id = ? ORDER BY id', [id]);
  return { ...cobranza, aplicaciones };
}
