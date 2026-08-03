import { baseDatos } from '../../configuracion/base-datos.js';

export async function listarCategorias() {
  const [filas] = await baseDatos.query(
    `SELECT id, categoria_padre_id, nombre, descripcion, icono_url, esta_activa
     FROM categorias WHERE esta_activa = TRUE ORDER BY nombre`,
  );
  return filas;
}

export async function crearCategoria(datos) {
  const [resultado] = await baseDatos.query(
    `INSERT INTO categorias (categoria_padre_id, nombre, descripcion)
     VALUES (?, ?, ?)`,
    [datos.categoria_padre_id ?? null, datos.nombre, datos.descripcion ?? null],
  );
  return { id: resultado.insertId, ...datos };
}

export async function listarReferencias() {
  const [[marcas], [unidades]] = await Promise.all([
    baseDatos.query('SELECT id, nombre FROM marcas WHERE esta_activa = TRUE ORDER BY nombre'),
    baseDatos.query(
      `SELECT id, nombre, abreviatura, permite_decimales
       FROM unidades_medida WHERE esta_activa = TRUE ORDER BY nombre`,
    ),
  ]);
  return { marcas, unidades_medida: unidades };
}

export async function listarProductos(consulta) {
  const condiciones = ['p.esta_activo = TRUE'];
  const parametros = [];
  if (consulta.categoria_id) {
    condiciones.push('p.categoria_id = ?');
    parametros.push(consulta.categoria_id);
  }
  if (consulta.buscar) {
    condiciones.push(`(p.nombre LIKE ? OR p.codigo_interno LIKE ? OR EXISTS (
      SELECT 1 FROM productos_codigos_barra pcb
      WHERE pcb.producto_id = p.id AND pcb.codigo_barra LIKE ?))`);
    const patron = `%${consulta.buscar}%`;
    parametros.push(patron, patron, patron);
  }
  const desplazamiento = (consulta.pagina - 1) * consulta.limite;
  const desde = `FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN marcas m ON m.id = p.marca_id
    JOIN unidades_medida um ON um.id = p.unidad_medida_id
    WHERE ${condiciones.join(' AND ')}`;
  const [[productos], [conteo]] = await Promise.all([
    baseDatos.query(
      `SELECT p.id, p.codigo_interno, p.nombre, p.precio_costo, p.precio_venta,
       p.precio_mayorista, p.stock_minimo, p.es_pesable, p.imagen_url,
       c.nombre AS categoria, m.nombre AS marca, um.abreviatura AS unidad_medida,
       (SELECT pcb.codigo_barra FROM productos_codigos_barra pcb
        WHERE pcb.producto_id = p.id ORDER BY pcb.es_principal DESC, pcb.id LIMIT 1) AS codigo_barra
       ${desde} ORDER BY p.nombre LIMIT ? OFFSET ?`,
      [...parametros, consulta.limite, desplazamiento],
    ),
    baseDatos.query(`SELECT COUNT(*) AS total ${desde}`, parametros),
  ]);
  return { datos: productos, total: conteo[0].total, pagina: consulta.pagina, limite: consulta.limite };
}

export async function crearProducto(datos) {
  const conexion = await baseDatos.getConnection();
  try {
    await conexion.beginTransaction();
    const [resultado] = await conexion.query(
      `INSERT INTO productos
       (categoria_id, marca_id, unidad_medida_id, codigo_interno, nombre,
        descripcion, contenido_neto, precio_costo, precio_venta, precio_mayorista,
        cantidad_minima_mayorista, stock_minimo, es_pesable, imagen_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [datos.categoria_id, datos.marca_id ?? null, datos.unidad_medida_id,
        datos.codigo_interno ?? null, datos.nombre, datos.descripcion ?? null,
        datos.contenido_neto ?? null, datos.precio_costo, datos.precio_venta,
        datos.precio_mayorista ?? null, datos.cantidad_minima_mayorista ?? null,
        datos.stock_minimo, datos.es_pesable, datos.imagen_url ?? null],
    );
    for (const [indice, codigo] of [...new Set(datos.codigos_barra)].entries()) {
      await conexion.query(
        `INSERT INTO productos_codigos_barra (producto_id, codigo_barra, es_principal)
         VALUES (?, ?, ?)`,
        [resultado.insertId, codigo, indice === 0],
      );
    }
    await conexion.commit();
    return { id: resultado.insertId, ...datos };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}
