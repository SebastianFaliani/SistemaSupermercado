import { baseDatos } from '../../configuracion/base-datos.js';

export async function listarUbicaciones() {
  const [filas] = await baseDatos.query(
    `SELECT id, codigo, nombre, tipo FROM ubicaciones_stock
     WHERE esta_activa = TRUE ORDER BY nombre`,
  );
  return filas;
}

export async function listarStock(consulta) {
  const condiciones = ['p.esta_activo = TRUE'];
  const parametros = [];
  if (consulta.buscar) {
    condiciones.push(`(p.nombre LIKE ? OR EXISTS (
      SELECT 1 FROM productos_codigos_barra pcb
      WHERE pcb.producto_id = p.id AND pcb.codigo_barra LIKE ?))`);
    const patron = `%${consulta.buscar}%`;
    parametros.push(patron, patron);
  }
  if (consulta.solo_bajo_minimo) {
    condiciones.push('p.stock_minimo > 0 AND COALESCE(e.cantidad, 0) < p.stock_minimo');
  }
  const desplazamiento = (consulta.pagina - 1) * consulta.limite;
  const desde = `FROM productos p
    CROSS JOIN ubicaciones_stock u
    LEFT JOIN existencias e ON e.producto_id = p.id AND e.ubicacion_id = u.id
    WHERE u.codigo = 'LOCAL_PRINCIPAL' AND ${condiciones.join(' AND ')}`;
  const [[datos], [conteo]] = await Promise.all([
    baseDatos.query(
      `SELECT p.id AS producto_id, u.id AS ubicacion_id, p.nombre, p.imagen_url,
       p.stock_minimo, p.es_pesable, COALESCE(e.cantidad, 0) AS cantidad,
       COALESCE(e.cantidad_reservada, 0) AS cantidad_reservada,
       (SELECT pcb.codigo_barra FROM productos_codigos_barra pcb
        WHERE pcb.producto_id = p.id ORDER BY pcb.es_principal DESC, pcb.id LIMIT 1) AS codigo_barra
       ${desde} ORDER BY p.nombre LIMIT ? OFFSET ?`,
      [...parametros, consulta.limite, desplazamiento],
    ),
    baseDatos.query(`SELECT COUNT(*) AS total ${desde}`, parametros),
  ]);
  return { datos, total: conteo[0].total, pagina: consulta.pagina, limite: consulta.limite };
}

export async function ajustarStock(datos, usuarioId) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [[producto]] = await conexion.query(
      `SELECT precio_costo, es_pesable FROM productos WHERE id = ?`,
      [datos.producto_id],
    );
    if (!producto) throw new Error('No se encontró el producto');
    const permiteDecimales = Boolean(producto.es_pesable);
    if (!permiteDecimales && !Number.isInteger(datos.cantidad_nueva)) {
      const error = new Error('La cantidad debe ser un número entero');
      error.codigoPublico = 'CANTIDAD_ENTERA';
      throw error;
    }
    await conexion.query(
      `INSERT IGNORE INTO existencias (producto_id, ubicacion_id, cantidad)
       VALUES (?, ?, 0)`,
      [datos.producto_id, datos.ubicacion_id],
    );
    const [existencias] = await conexion.query(
      `SELECT cantidad FROM existencias
       WHERE producto_id = ? AND ubicacion_id = ? FOR UPDATE`,
      [datos.producto_id, datos.ubicacion_id],
    );
    if (!existencias[0]) throw new Error('No se encontró la existencia');
    const cantidadAnterior = Number(existencias[0].cantidad);
    const variacion = datos.cantidad_nueva - cantidadAnterior;
    if (variacion === 0) {
      const error = new Error('La cantidad nueva es igual a la actual');
      error.codigoPublico = 'SIN_CAMBIOS';
      throw error;
    }
    const [movimiento] = await conexion.query(
      `INSERT INTO movimientos_stock (ubicacion_id, usuario_id, tipo, motivo)
       VALUES (?, ?, 'ajuste_manual', ?)`,
      [datos.ubicacion_id, usuarioId, datos.motivo],
    );
    await conexion.query(
      `INSERT INTO movimientos_stock_detalles
       (movimiento_stock_id, producto_id, cantidad_anterior, variacion,
        cantidad_nueva, costo_unitario) VALUES (?, ?, ?, ?, ?, ?)`,
      [movimiento.insertId, datos.producto_id, cantidadAnterior, variacion,
        datos.cantidad_nueva, producto.precio_costo],
    );
    await conexion.query(
      `UPDATE existencias SET cantidad = ?
       WHERE producto_id = ? AND ubicacion_id = ?`,
      [datos.cantidad_nueva, datos.producto_id, datos.ubicacion_id],
    );
    await conexion.commit();
    return { movimiento_id: movimiento.insertId, cantidad_anterior: cantidadAnterior,
      variacion, cantidad_nueva: datos.cantidad_nueva };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}
