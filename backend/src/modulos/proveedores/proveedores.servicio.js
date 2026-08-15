import { baseDatos } from '../../configuracion/base-datos.js';

const campos = ['razon_social', 'nombre_fantasia', 'cuit', 'condicion_iva', 'persona_contacto',
  'telefono', 'correo_electronico', 'direccion', 'observaciones'];
const valor = (datos, campo) => datos[campo] || null;

export async function listarProveedores(consulta) {
  const condiciones = [];
  const parametros = [];
  if (consulta.buscar) {
    condiciones.push(`(razon_social LIKE ? OR nombre_fantasia LIKE ? OR cuit LIKE ?
      OR persona_contacto LIKE ? OR correo_electronico LIKE ?)`);
    const patron = `%${consulta.buscar}%`;
    parametros.push(patron, patron, patron, patron, patron);
  }
  if (consulta.estado !== 'todos') {
    condiciones.push('esta_activo = ?');
    parametros.push(consulta.estado === 'activos');
  }
  if (consulta.cuenta === 'deuda') condiciones.push("EXISTS (SELECT 1 FROM facturas_proveedores fp WHERE fp.proveedor_id = proveedores.id AND fp.saldo_pendiente > 0 AND fp.estado <> 'anulada')");
  if (consulta.cuenta === 'vencida') condiciones.push("EXISTS (SELECT 1 FROM facturas_proveedores fp WHERE fp.proveedor_id = proveedores.id AND fp.saldo_pendiente > 0 AND fp.fecha_vencimiento < CURRENT_DATE() AND fp.estado <> 'anulada')");
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const desplazamiento = (consulta.pagina - 1) * consulta.limite;
  const [[datos], [conteo]] = await Promise.all([
    baseDatos.query(
      `SELECT id, ${campos.join(', ')}, esta_activo,
       (SELECT COALESCE(SUM(fp.saldo_pendiente), 0) FROM facturas_proveedores fp WHERE fp.proveedor_id = proveedores.id AND fp.estado <> 'anulada') AS saldo,
       (SELECT COALESCE(SUM(fp.saldo_pendiente), 0) FROM facturas_proveedores fp WHERE fp.proveedor_id = proveedores.id AND fp.estado <> 'anulada' AND fp.fecha_vencimiento < CURRENT_DATE()) AS vencido
       FROM proveedores ${donde}
       ORDER BY COALESCE(nombre_fantasia, razon_social), razon_social LIMIT ? OFFSET ?`,
      [...parametros, consulta.limite, desplazamiento],
    ),
    baseDatos.query(`SELECT COUNT(*) AS total FROM proveedores ${donde}`, parametros),
  ]);
  return { datos, total: conteo[0].total, pagina: consulta.pagina, limite: consulta.limite };
}

export async function crearProveedor(datos) {
  const [resultado] = await baseDatos.query(
    `INSERT INTO proveedores (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`,
    campos.map((campo) => valor(datos, campo)),
  );
  return { id: resultado.insertId };
}

export async function editarProveedor(id, datos) {
  const [resultado] = await baseDatos.query(
    `UPDATE proveedores SET ${campos.map((campo) => `${campo} = ?`).join(', ')}, esta_activo = ?
     WHERE id = ?`,
    [...campos.map((campo) => valor(datos, campo)), datos.esta_activo, id],
  );
  if (!resultado.affectedRows) {
    const error = new Error('No se encontró el proveedor');
    error.codigoPublico = 'NO_ENCONTRADO';
    throw error;
  }
  return { id };
}

export async function obtenerCuentaProveedor(id) {
  const [[proveedor]] = await baseDatos.query(`SELECT p.id, p.razon_social, p.nombre_fantasia, p.cuit,
    COALESCE(SUM(fp.saldo_pendiente), 0) AS saldo,
    COALESCE(SUM(CASE WHEN fp.saldo_pendiente > 0 AND fp.fecha_vencimiento < CURRENT_DATE() THEN fp.saldo_pendiente ELSE 0 END), 0) AS vencido
    FROM proveedores p LEFT JOIN facturas_proveedores fp ON fp.proveedor_id = p.id AND fp.estado <> 'anulada'
    WHERE p.id = ? GROUP BY p.id`, [id]);
  if (!proveedor) return null;
  const [[facturas], [pagos], [ordenes]] = await Promise.all([
    baseDatos.query(`SELECT id, orden_compra_id, tipo_comprobante, numero_comprobante, fecha_emision,
      fecha_vencimiento, total, saldo_pendiente, estado, observaciones
      FROM facturas_proveedores WHERE proveedor_id = ? ORDER BY fecha_vencimiento DESC, id DESC LIMIT 200`, [id]),
    baseDatos.query(`SELECT pp.id, pp.medio, pp.monto, pp.referencia, pp.observaciones, pp.fecha_creacion,
      u.nombre_usuario, ct.nombre AS cuenta_tesoreria FROM pagos_proveedores pp JOIN usuarios u ON u.id = pp.usuario_id
      LEFT JOIN cuentas_tesoreria ct ON ct.id = pp.cuenta_tesoreria_id
      WHERE pp.proveedor_id = ? ORDER BY pp.fecha_creacion DESC LIMIT 200`, [id]),
    baseDatos.query(`SELECT oc.id, oc.total, oc.fecha_esperada, oc.fecha_recepcion,
      (SELECT COUNT(*) FROM ordenes_compra_detalles d WHERE d.orden_compra_id = oc.id) AS productos
      FROM ordenes_compra oc
      WHERE oc.proveedor_id = ? AND oc.estado = 'recibida'
      AND NOT EXISTS (SELECT 1 FROM facturas_proveedores fp WHERE fp.orden_compra_id = oc.id)
      ORDER BY oc.id DESC LIMIT 100`, [id]),
  ]);
  return { ...proveedor, saldo: Number(proveedor.saldo), vencido: Number(proveedor.vencido), facturas, pagos, ordenes };
}

export async function crearFacturaProveedor(proveedorId, usuarioId, datos) {
  if (datos.orden_compra_id) {
    const [[orden]] = await baseDatos.query(`SELECT oc.id FROM ordenes_compra oc
      WHERE oc.id = ? AND oc.proveedor_id = ? AND oc.estado IN ('parcial', 'recibida')
      AND NOT EXISTS (SELECT 1 FROM facturas_proveedores fp WHERE fp.orden_compra_id = oc.id)`, [datos.orden_compra_id, proveedorId]);
    if (!orden) { const error = new Error('La orden no está disponible o ya tiene una factura asociada'); error.codigoPublico = 'ORDEN_INVALIDA'; throw error; }
  }
  try {
    const [resultado] = await baseDatos.query(`INSERT INTO facturas_proveedores
      (proveedor_id, orden_compra_id, usuario_id, tipo_comprobante, numero_comprobante,
       fecha_emision, fecha_vencimiento, total, saldo_pendiente, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [proveedorId, datos.orden_compra_id || null, usuarioId,
      datos.tipo_comprobante, datos.numero_comprobante, datos.fecha_emision, datos.fecha_vencimiento,
      datos.total, datos.total, datos.observaciones || null]);
    return { id: resultado.insertId };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage?.includes('uq_factura_orden_compra')) {
      const conflicto = new Error('La orden de compra ya tiene una factura asociada');
      conflicto.codigoPublico = 'ORDEN_YA_FACTURADA';
      throw conflicto;
    }
    if (error.code === 'ER_DUP_ENTRY') {
      const conflicto = new Error('Ya existe una factura con ese tipo y número para el proveedor');
      conflicto.codigoPublico = 'FACTURA_DUPLICADA';
      throw conflicto;
    }
    throw error;
  }
}

export async function registrarPagoProveedor(proveedorId, usuarioId, datos) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    let sesionId = null;
    let cuentaTesoreria = null;
    const [[proveedor]] = await conexion.query('SELECT id, COALESCE(nombre_fantasia, razon_social) AS nombre FROM proveedores WHERE id = ? FOR UPDATE', [proveedorId]);
    if (!proveedor) { const error = new Error('No se encontró el proveedor'); error.codigoPublico = 'NO_ENCONTRADO'; throw error; }
    if (datos.medio === 'efectivo' && datos.origen_efectivo === 'caja') {
      const [[sesion]] = await conexion.query("SELECT id FROM sesiones_caja WHERE usuario_id = ? AND estado = 'abierta' ORDER BY id DESC LIMIT 1 FOR UPDATE", [usuarioId]);
      if (!sesion) { const error = new Error('Debés tener una caja abierta para pagar en efectivo'); error.codigoPublico = 'SIN_CAJA'; throw error; }
      sesionId = sesion.id;
    } else {
      const [[cuenta]] = await conexion.query(`SELECT ct.id, ct.nombre, ct.tipo, ct.esta_activa,
        ct.saldo_inicial + COALESCE((SELECT SUM(CASE WHEN mt.tipo = 'ingreso' THEN mt.monto ELSE -mt.monto END)
        FROM movimientos_tesoreria mt WHERE mt.cuenta_tesoreria_id = ct.id), 0) AS saldo
        FROM cuentas_tesoreria ct WHERE ct.id = ? FOR UPDATE`, [datos.cuenta_tesoreria_id]);
      if (!cuenta || !cuenta.esta_activa || (datos.medio === 'efectivo' && cuenta.tipo !== 'efectivo')) { const error = new Error('La cuenta de Tesorería no está disponible para este pago'); error.codigoPublico = 'CUENTA_INVALIDA'; throw error; }
      if (Number(cuenta.saldo) + 0.009 < datos.monto) { const error = new Error(`Saldo insuficiente en ${cuenta.nombre}`); error.codigoPublico = 'SALDO_INSUFICIENTE'; throw error; }
      cuentaTesoreria = cuenta;
    }
    const [facturas] = await conexion.query("SELECT id, saldo_pendiente FROM facturas_proveedores WHERE proveedor_id = ? AND estado IN ('pendiente', 'parcial') AND saldo_pendiente > 0 ORDER BY fecha_vencimiento, id FOR UPDATE", [proveedorId]);
    const saldo = facturas.reduce((suma, factura) => suma + Number(factura.saldo_pendiente), 0);
    if (!saldo) { const error = new Error('El proveedor no tiene deuda pendiente'); error.codigoPublico = 'SIN_DEUDA'; throw error; }
    if (datos.monto - saldo > 0.009) { const error = new Error('El pago no puede superar la deuda del proveedor'); error.codigoPublico = 'MONTO_INVALIDO'; throw error; }
    const [pago] = await conexion.query(`INSERT INTO pagos_proveedores
      (proveedor_id, sesion_caja_id, cuenta_tesoreria_id, usuario_id, medio, monto, referencia, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [proveedorId, sesionId, cuentaTesoreria?.id || null, usuarioId, datos.medio, datos.monto, datos.referencia || null, datos.observaciones || null]);
    if (cuentaTesoreria) {
      await conexion.query(`INSERT INTO movimientos_tesoreria
        (cuenta_tesoreria_id, usuario_id, tipo, categoria, concepto, monto, referencia, fecha, pago_proveedor_id)
        VALUES (?, ?, 'egreso', 'proveedores', ?, ?, ?, CURRENT_DATE(), ?)`,
      [cuentaTesoreria.id, usuarioId, `Pago a proveedor ${proveedor.nombre}`, datos.monto, datos.referencia || `Pago #${pago.insertId}`, pago.insertId]);
    }
    let restante = Number(datos.monto);
    for (const factura of facturas) {
      if (restante <= 0.009) break;
      const aplicado = Math.min(restante, Number(factura.saldo_pendiente));
      await conexion.query('INSERT INTO pagos_proveedores_aplicaciones (pago_proveedor_id, factura_proveedor_id, monto) VALUES (?, ?, ?)', [pago.insertId, factura.id, aplicado]);
      await conexion.query(`UPDATE facturas_proveedores SET
        estado = CASE WHEN saldo_pendiente - ? <= 0.009 THEN 'pagada' ELSE 'parcial' END,
        saldo_pendiente = saldo_pendiente - ? WHERE id = ?`, [aplicado, aplicado, factura.id]);
      restante -= aplicado;
    }
    await conexion.commit(); return { id: pago.insertId, saldo_anterior: saldo, saldo_nuevo: saldo - datos.monto };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
}

export async function obtenerPagoProveedor(id) {
  const [[pago]] = await baseDatos.query(`SELECT pp.id, pp.medio, pp.monto, pp.referencia,
    pp.observaciones, pp.fecha_creacion, COALESCE(p.nombre_fantasia, p.razon_social) AS proveedor,
    p.cuit, u.nombre_usuario, c.nombre AS caja, ct.nombre AS cuenta_tesoreria FROM pagos_proveedores pp
    JOIN proveedores p ON p.id = pp.proveedor_id JOIN usuarios u ON u.id = pp.usuario_id
    LEFT JOIN sesiones_caja sc ON sc.id = pp.sesion_caja_id LEFT JOIN cajas c ON c.id = sc.caja_id
    LEFT JOIN cuentas_tesoreria ct ON ct.id = pp.cuenta_tesoreria_id WHERE pp.id = ?`, [id]);
  if (!pago) return null;
  const [aplicaciones] = await baseDatos.query(`SELECT ppa.factura_proveedor_id, ppa.monto,
    fp.numero_comprobante FROM pagos_proveedores_aplicaciones ppa JOIN facturas_proveedores fp
    ON fp.id = ppa.factura_proveedor_id WHERE ppa.pago_proveedor_id = ? ORDER BY ppa.id`, [id]);
  return { ...pago, aplicaciones };
}
