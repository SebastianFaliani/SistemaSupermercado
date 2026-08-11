import { baseDatos } from '../../configuracion/base-datos.js';

export async function obtenerReporte({ fecha_desde: desde, fecha_hasta: hasta }) {
  const parametros = [`${desde} 00:00:00`, `${hasta} 00:00:00`];
  const rango = `v.fecha_creacion >= ? AND v.fecha_creacion < DATE_ADD(?, INTERVAL 1 DAY) AND v.estado = 'completada'`;
  const [[resumen], [porDia], [productos], [categorias], [medios], [credito], [deuda], [proveedores], [gastos], [sueldos], [adelantos]] = await Promise.all([
    baseDatos.query(`SELECT COUNT(DISTINCT v.id) AS operaciones, COALESCE(SUM(vd.subtotal), 0) AS ventas, COALESCE(SUM(vd.cantidad * vd.costo_unitario), 0) AS costo FROM ventas v JOIN ventas_detalles vd ON vd.venta_id = v.id WHERE ${rango}`, parametros),
    baseDatos.query(`SELECT DATE(v.fecha_creacion) AS fecha, COUNT(DISTINCT v.id) AS operaciones, SUM(vd.subtotal) AS ventas, SUM(vd.cantidad * vd.costo_unitario) AS costo FROM ventas v JOIN ventas_detalles vd ON vd.venta_id = v.id WHERE ${rango} GROUP BY DATE(v.fecha_creacion) ORDER BY fecha`, parametros),
    baseDatos.query(`SELECT p.nombre, SUM(vd.cantidad) AS cantidad, SUM(vd.subtotal) AS ventas, SUM(vd.subtotal - vd.cantidad * vd.costo_unitario) AS margen FROM ventas v JOIN ventas_detalles vd ON vd.venta_id = v.id JOIN productos p ON p.id = vd.producto_id WHERE ${rango} GROUP BY p.id, p.nombre ORDER BY ventas DESC LIMIT 15`, parametros),
    baseDatos.query(`SELECT c.nombre, SUM(vd.subtotal) AS ventas, SUM(vd.subtotal - vd.cantidad * vd.costo_unitario) AS margen FROM ventas v JOIN ventas_detalles vd ON vd.venta_id = v.id JOIN productos p ON p.id = vd.producto_id JOIN categorias c ON c.id = p.categoria_id WHERE ${rango} GROUP BY c.id, c.nombre ORDER BY ventas DESC`, parametros),
    baseDatos.query(`SELECT vp.medio, SUM(vp.monto) AS total FROM ventas v JOIN ventas_pagos vp ON vp.venta_id = v.id WHERE ${rango} GROUP BY vp.medio ORDER BY total DESC`, parametros),
    baseDatos.query(`SELECT COALESCE(SUM(v.total - COALESCE(p.pagado, 0)), 0) AS otorgado FROM ventas v LEFT JOIN (SELECT venta_id, SUM(monto) AS pagado FROM ventas_pagos GROUP BY venta_id) p ON p.venta_id = v.id WHERE ${rango}`, parametros),
    baseDatos.query(`SELECT COALESCE(SUM(saldo_pendiente), 0) AS total, COALESCE(SUM(CASE WHEN fecha_vencimiento < CURRENT_DATE() THEN saldo_pendiente ELSE 0 END), 0) AS vencido FROM ventas WHERE estado = 'completada'`),
    baseDatos.query(`SELECT COALESCE(SUM(saldo_pendiente), 0) AS total, COALESCE(SUM(CASE WHEN fecha_vencimiento < CURRENT_DATE() THEN saldo_pendiente ELSE 0 END), 0) AS vencido FROM facturas_proveedores WHERE estado IN ('pendiente', 'parcial')`),
    baseDatos.query(`SELECT
      (SELECT COALESCE(SUM(pg.monto), 0) FROM pagos_gastos pg WHERE pg.fecha_creacion >= ? AND pg.fecha_creacion < DATE_ADD(?, INTERVAL 1 DAY)) AS pagado,
      COALESCE(SUM(g.saldo_pendiente), 0) AS pendiente,
      COALESCE(SUM(CASE WHEN g.fecha_vencimiento < CURRENT_DATE() THEN g.saldo_pendiente ELSE 0 END), 0) AS vencido
      FROM gastos g WHERE g.estado IN ('pendiente', 'parcial')`, parametros),
    baseDatos.query(`SELECT (SELECT COALESCE(SUM(monto),0) FROM pagos_sueldos WHERE fecha_creacion>=? AND fecha_creacion<DATE_ADD(?,INTERVAL 1 DAY)) pagado,COALESCE(SUM(saldo_pendiente),0) pendiente FROM liquidaciones_sueldos WHERE estado IN ('pendiente','parcial')`, parametros),
    baseDatos.query(`SELECT COALESCE(SUM(monto),0) pagado FROM adelantos_empleados WHERE fecha>=? AND fecha<=?`, [desde, hasta]),
  ]);
  const ventas = Number(resumen[0].ventas); const costo = Number(resumen[0].costo);
  const sueldosPagados = Number(sueldos[0].pagado); const adelantosPagados = Number(adelantos[0].pagado);
  return { resumen: { operaciones: Number(resumen[0].operaciones), ventas, costo, margen: ventas - costo, ticket_promedio: Number(resumen[0].operaciones) ? ventas / Number(resumen[0].operaciones) : 0, credito_otorgado: Number(credito[0].otorgado), cuentas_por_cobrar: Number(deuda[0].total), deuda_vencida: Number(deuda[0].vencido), cuentas_por_pagar: Number(proveedores[0].total), proveedores_vencido: Number(proveedores[0].vencido), gastos_pagados: Number(gastos[0].pagado), gastos_pendientes: Number(gastos[0].pendiente), gastos_vencidos: Number(gastos[0].vencido), sueldos_pagados: sueldosPagados, adelantos_pagados: adelantosPagados, total_personal_pagado: sueldosPagados + adelantosPagados, sueldos_pendientes: Number(sueldos[0].pendiente) }, por_dia: porDia, productos, categorias, medios };
}
