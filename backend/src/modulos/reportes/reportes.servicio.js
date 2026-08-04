import { baseDatos } from '../../configuracion/base-datos.js';

export async function obtenerReporte({ fecha_desde: desde, fecha_hasta: hasta }) {
  const parametros = [`${desde} 00:00:00`, `${hasta} 00:00:00`];
  const rango = `v.fecha_creacion >= ? AND v.fecha_creacion < DATE_ADD(?, INTERVAL 1 DAY) AND v.estado = 'completada'`;
  const [[resumen], [porDia], [productos], [categorias], [medios]] = await Promise.all([
    baseDatos.query(`SELECT COUNT(DISTINCT v.id) AS operaciones, COALESCE(SUM(vd.subtotal), 0) AS ventas, COALESCE(SUM(vd.cantidad * vd.costo_unitario), 0) AS costo FROM ventas v JOIN ventas_detalles vd ON vd.venta_id = v.id WHERE ${rango}`, parametros),
    baseDatos.query(`SELECT DATE(v.fecha_creacion) AS fecha, COUNT(DISTINCT v.id) AS operaciones, SUM(vd.subtotal) AS ventas, SUM(vd.cantidad * vd.costo_unitario) AS costo FROM ventas v JOIN ventas_detalles vd ON vd.venta_id = v.id WHERE ${rango} GROUP BY DATE(v.fecha_creacion) ORDER BY fecha`, parametros),
    baseDatos.query(`SELECT p.nombre, SUM(vd.cantidad) AS cantidad, SUM(vd.subtotal) AS ventas, SUM(vd.subtotal - vd.cantidad * vd.costo_unitario) AS margen FROM ventas v JOIN ventas_detalles vd ON vd.venta_id = v.id JOIN productos p ON p.id = vd.producto_id WHERE ${rango} GROUP BY p.id, p.nombre ORDER BY ventas DESC LIMIT 15`, parametros),
    baseDatos.query(`SELECT c.nombre, SUM(vd.subtotal) AS ventas, SUM(vd.subtotal - vd.cantidad * vd.costo_unitario) AS margen FROM ventas v JOIN ventas_detalles vd ON vd.venta_id = v.id JOIN productos p ON p.id = vd.producto_id JOIN categorias c ON c.id = p.categoria_id WHERE ${rango} GROUP BY c.id, c.nombre ORDER BY ventas DESC`, parametros),
    baseDatos.query(`SELECT vp.medio, SUM(vp.monto) AS total FROM ventas v JOIN ventas_pagos vp ON vp.venta_id = v.id WHERE ${rango} GROUP BY vp.medio ORDER BY total DESC`, parametros),
  ]);
  const ventas = Number(resumen[0].ventas); const costo = Number(resumen[0].costo);
  return { resumen: { operaciones: Number(resumen[0].operaciones), ventas, costo, margen: ventas - costo, ticket_promedio: Number(resumen[0].operaciones) ? ventas / Number(resumen[0].operaciones) : 0 }, por_dia: porDia, productos, categorias, medios };
}
