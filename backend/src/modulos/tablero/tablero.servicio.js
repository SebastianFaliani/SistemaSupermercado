import { baseDatos } from '../../configuracion/base-datos.js';

export async function obtenerTablero() {
  const [[ventasHoy], [inventario], [compras], [cajas], [ultimasVentas]] = await Promise.all([
    baseDatos.query(`SELECT COUNT(*) AS operaciones, COALESCE(SUM(total), 0) AS total FROM ventas WHERE estado = 'completada' AND fecha_creacion >= CURRENT_DATE()`),
    baseDatos.query(`SELECT COUNT(*) AS productos, SUM(CASE WHEN COALESCE(e.cantidad, 0) <= p.stock_minimo THEN 1 ELSE 0 END) AS bajo_minimo, COALESCE(SUM(COALESCE(e.cantidad, 0) * p.precio_costo), 0) AS valor_costo FROM productos p JOIN ubicaciones_stock u ON u.codigo = 'LOCAL_PRINCIPAL' LEFT JOIN existencias e ON e.producto_id = p.id AND e.ubicacion_id = u.id WHERE p.esta_activo = TRUE`),
    baseDatos.query(`SELECT SUM(CASE WHEN estado IN ('borrador', 'enviada', 'parcial') THEN 1 ELSE 0 END) AS pendientes, SUM(CASE WHEN estado IN ('enviada', 'parcial') AND fecha_esperada < CURRENT_DATE() THEN 1 ELSE 0 END) AS demoradas FROM ordenes_compra`),
    baseDatos.query(`SELECT COUNT(*) AS abiertas FROM sesiones_caja WHERE estado = 'abierta'`),
    baseDatos.query(`SELECT v.id, v.total, v.fecha_creacion, u.nombre_usuario, c.nombre AS caja FROM ventas v JOIN usuarios u ON u.id = v.usuario_id JOIN sesiones_caja sc ON sc.id = v.sesion_caja_id JOIN cajas c ON c.id = sc.caja_id WHERE v.estado = 'completada' ORDER BY v.fecha_creacion DESC LIMIT 5`),
  ]);
  return { ventas_hoy: { operaciones: Number(ventasHoy[0].operaciones), total: Number(ventasHoy[0].total) }, inventario: { productos: Number(inventario[0].productos), bajo_minimo: Number(inventario[0].bajo_minimo), valor_costo: Number(inventario[0].valor_costo) }, compras: { pendientes: Number(compras[0].pendientes), demoradas: Number(compras[0].demoradas) }, cajas_abiertas: Number(cajas[0].abiertas), ultimas_ventas: ultimasVentas };
}
