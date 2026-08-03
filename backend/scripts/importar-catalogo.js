import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { baseDatos } from '../src/configuracion/base-datos.js';

const MARGEN_PREDETERMINADO = 30;
const MULTIPLO_REDONDEO = 10;
const NOMBRES_CATEGORIAS = new Map([
  ['Almacen', 'Almacén'],
  ['Lacteos y productos frescos', 'Lácteos y productos frescos'],
  ['Mundo bebe', 'Mundo bebé'],
  ['Panaderia', 'Panadería'],
  ['Perfumeria y cuidado personal', 'Perfumería y cuidado personal'],
]);
const aplicar = process.argv.includes('--aplicar');
const archivoOrigen = process.env.CATALOGO_ORIGEN ??
  'D:\\Supermercado\\mis_productos_con_imagenes.json';
const carpetaImagenesOrigen = resolve(dirname(archivoOrigen), 'imagenes');
const carpetaProyecto = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const carpetaImagenesDestino = resolve(carpetaProyecto, 'storage/imagenes_productos');

function corregirTexto(valor) {
  if (typeof valor !== 'string') return valor;
  return /Ã|Â/.test(valor) ? Buffer.from(valor, 'latin1').toString('utf8') : valor;
}

function calcularPrecioVenta(costo) {
  const precio = costo * (1 + MARGEN_PREDETERMINADO / 100);
  return Math.round(precio / MULTIPLO_REDONDEO) * MULTIPLO_REDONDEO;
}

function interpretarUnidad(producto) {
  const presentacion = corregirTexto(producto.unidad_medida)?.trim() ?? '';
  const coincidencia = presentacion.match(/^(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg|un)$/i);
  if (coincidencia) {
    const unidades = { ml: 'ml', l: 'l', g: 'g', kg: 'kg', un: 'u' };
    return {
      abreviatura: unidades[coincidencia[2].toLowerCase()],
      contenido: Number(coincidencia[1].replace(',', '.')),
      esPesable: false,
    };
  }
  const nombre = corregirTexto(producto.nombre_producto);
  if (/\bx\s*kg\b|\bpor\s+kg\b/i.test(nombre)) {
    return { abreviatura: 'kg', contenido: null, esPesable: true };
  }
  return { abreviatura: 'u', contenido: null, esPesable: false };
}

const productosOrigen = JSON.parse(await readFile(archivoOrigen, 'utf8')).map((producto) => ({
  ...producto,
  nombre_producto: corregirTexto(producto.nombre_producto),
  categoria: NOMBRES_CATEGORIAS.get(corregirTexto(producto.categoria)) ??
    corregirTexto(producto.categoria),
  detalles: corregirTexto(producto.detalles),
}));
const codigos = new Set(productosOrigen.map(({ codigo_barra }) => String(codigo_barra)));
const categorias = new Set(productosOrigen.map(({ categoria }) => categoria));
const conImagen = productosOrigen.filter(({ imagen_url }) => imagen_url).length;
const pesables = productosOrigen.filter((producto) => interpretarUnidad(producto).esPesable).length;

console.log(JSON.stringify({
  modo: aplicar ? 'aplicar' : 'vista_previa',
  productos: productosOrigen.length,
  codigos_unicos: codigos.size,
  categorias: categorias.size,
  con_imagen: conImagen,
  productos_pesables_inferidos: pesables,
  margen_porcentaje: MARGEN_PREDETERMINADO,
  redondeo_multiplo: MULTIPLO_REDONDEO,
  mapeo_precio_costo: 'precio_mayorista del archivo origen',
}, null, 2));

if (codigos.size !== productosOrigen.length) {
  throw new Error('El catálogo contiene códigos de barras duplicados');
}

if (!aplicar) {
  console.log('Vista previa finalizada. Use --aplicar para guardar los datos.');
  await baseDatos.end();
  process.exit(0);
}

const conexion = await baseDatos.getConnection();
const imagenesParaCopiar = [];
let importados = 0;
let omitidos = 0;

try {
  await conexion.beginTransaction();
  const [unidades] = await conexion.query('SELECT id, abreviatura FROM unidades_medida');
  const unidadPorAbreviatura = new Map(unidades.map(({ id, abreviatura }) => [abreviatura, id]));
  const categoriaPorNombre = new Map();

  for (const nombre of [...categorias].sort()) {
    const [existentes] = await conexion.query(
      'SELECT id FROM categorias WHERE categoria_padre_id IS NULL AND nombre = ? LIMIT 1',
      [nombre],
    );
    let categoriaId = existentes[0]?.id;
    if (!categoriaId) {
      const [resultado] = await conexion.query(
        `INSERT INTO categorias (nombre, porcentaje_margen_predeterminado)
         VALUES (?, ?)`,
        [nombre, MARGEN_PREDETERMINADO],
      );
      categoriaId = resultado.insertId;
    }
    categoriaPorNombre.set(nombre, categoriaId);
  }

  for (const producto of productosOrigen) {
    const codigo = String(producto.codigo_barra);
    const [existentes] = await conexion.query(
      'SELECT producto_id FROM productos_codigos_barra WHERE codigo_barra = ? LIMIT 1',
      [codigo],
    );
    if (existentes.length) {
      omitidos += 1;
      continue;
    }
    const unidad = interpretarUnidad(producto);
    const costo = Number(producto.precio_mayorista);
    const precioVenta = calcularPrecioVenta(costo);
    const nombreImagen = producto.imagen_url ? basename(producto.imagen_url) : null;
    const imagenUrl = nombreImagen ? `/imagenes_productos/${nombreImagen}` : null;
    const [resultado] = await conexion.query(
      `INSERT INTO productos
       (categoria_id, unidad_medida_id, nombre, descripcion, contenido_neto,
        precio_costo, precio_venta, precio_mayorista, porcentaje_margen,
        stock_minimo, es_pesable, imagen_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?, ?)`,
      [categoriaPorNombre.get(producto.categoria), unidadPorAbreviatura.get(unidad.abreviatura),
        producto.nombre_producto, producto.detalles || null, unidad.contenido,
        costo, precioVenta, unidad.esPesable, imagenUrl],
    );
    await conexion.query(
      `INSERT INTO productos_codigos_barra (producto_id, codigo_barra, es_principal)
       VALUES (?, ?, TRUE)`,
      [resultado.insertId, codigo],
    );
    await conexion.query(
      `INSERT INTO historiales_precios
       (producto_id, precio_costo_nuevo, precio_venta_nuevo, porcentaje_margen, origen)
       VALUES (?, ?, ?, ?, 'importacion_inicial')`,
      [resultado.insertId, costo, precioVenta, MARGEN_PREDETERMINADO],
    );
    if (nombreImagen) imagenesParaCopiar.push(nombreImagen);
    importados += 1;
  }
  await conexion.commit();
} catch (error) {
  await conexion.rollback();
  throw error;
} finally {
  conexion.release();
  await baseDatos.end();
}

await mkdir(carpetaImagenesDestino, { recursive: true });
let imagenesCopiadas = 0;
for (const nombre of imagenesParaCopiar) {
  try {
    await copyFile(resolve(carpetaImagenesOrigen, nombre), resolve(carpetaImagenesDestino, nombre));
    imagenesCopiadas += 1;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

console.log(JSON.stringify({ importados, omitidos, imagenes_copiadas: imagenesCopiadas }, null, 2));
