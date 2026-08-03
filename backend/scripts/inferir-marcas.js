import { baseDatos } from '../src/configuracion/base-datos.js';

const aplicar = process.argv.includes('--aplicar');
const palabrasExcluidas = new Set([
  'PET', 'PACK', 'LIGHT', 'ZERO', 'DIET', 'CLASSIC', 'CLASICO', 'CLASICA',
  'GRANDE', 'MEDIANO', 'MEDIANA', 'CHICO', 'CHICA', 'SACHET', 'LATA',
  'BOTELLA', 'PAQUETE', 'DISPLAY', 'PREMIUM', 'ORIGINAL', 'MAX', 'PLUS',
  'PRO', 'GEL', 'SPRAY', 'ROLL', 'ON', 'OFF', 'SIN', 'CON', 'ULTRA',
  'SUPER', 'MEGA', 'TACC', 'INT', 'EXT', 'KG', 'GR', 'ML', 'LT',
]);
const variantesDeLinea = new Map([
  ['S&P T/B', 'S&P'],
  ['DOVE MEN', 'DOVE'],
  ['DOVE CLINICAL', 'DOVE'],
  ['DOVE MEN CLINICAL', 'DOVE'],
  ['ALA CAMELLITO', 'ALA'],
  ['REXONA MEN', 'REXONA'],
  ['REXONA EFFICIENT', 'REXONA'],
  ['REXONA CLINICAL', 'REXONA'],
  ['PLUSBELLE ESEN', 'PLUSBELLE'],
  ['GALLO SNACKS', 'GALLO'],
  ['GALLO ORO', 'GALLO'],
  ['H&S MEN', 'H&S'],
  ['NIVEA SUN', 'NIVEA'],
  ['NIVEA MEN', 'NIVEA'],
  ['HUGGIES A.SEC', 'HUGGIES'],
  ['COFLER BLOCKAZO', 'COFLER'],
  ['DOLCA SUAVE', 'DOLCA'],
  ['SWIFT BURGER', 'SWIFT'],
  ['ELITE GOLD', 'ELITE'],
  ['ELITE MAXIROLLO', 'ELITE'],
  ['EXQUISITA ESPECIAL', 'EXQUISITA'],
  ['HILERET STEVIA', 'HILERET'],
  ['HILERET SWEET', 'HILERET'],
  ['HILERET ZUCRA', 'HILERET'],
  ['KEVIN BLACK', 'KEVIN'],
  ['PANTENE PRO-V', 'PANTENE'],
  ['NESCAFE GOLD', 'NESCAFE'],
  ['TODDY EXTREMO', 'TODDY'],
  ['SUSSEX MAXI', 'SUSSEX'],
]);

function limpiarToken(token) {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function esPalabraDeMarca(token) {
  const limpio = limpiarToken(token);
  const letras = limpio.replace(/[^\p{L}]/gu, '');
  return letras.length >= 2 &&
    letras === letras.toLocaleUpperCase('es-AR') &&
    letras !== letras.toLocaleLowerCase('es-AR') &&
    !palabrasExcluidas.has(limpio);
}

function inferirMarca(nombre) {
  const tokens = nombre.split(/\s+/);
  for (let indice = 1; indice < tokens.length; indice += 1) {
    if (!esPalabraDeMarca(tokens[indice])) continue;
    const partes = [];
    while (indice < tokens.length && esPalabraDeMarca(tokens[indice])) {
      partes.push(limpiarToken(tokens[indice]));
      indice += 1;
    }
    if (partes.length) return partes.join(' ');
  }
  return null;
}

const [productos] = await baseDatos.query(
  `SELECT id, nombre, es_pesable FROM productos
   WHERE marca_id IS NULL ORDER BY id`,
);
const candidatos = [];
const conteos = new Map();
let ambiguosPesables = 0;
let sinCandidato = 0;

for (const producto of productos) {
  if (producto.es_pesable) {
    ambiguosPesables += 1;
    continue;
  }
  const marca = inferirMarca(producto.nombre);
  if (!marca) {
    sinCandidato += 1;
    continue;
  }
  candidatos.push({ productoId: producto.id, marca });
  conteos.set(marca, (conteos.get(marca) ?? 0) + 1);
}

console.log(JSON.stringify({
  modo: aplicar ? 'aplicar' : 'vista_previa',
  productos_sin_marca: productos.length,
  asignaciones_propuestas: candidatos.length,
  marcas_propuestas: conteos.size,
  ambiguos_pesables: ambiguosPesables,
  sin_candidato: sinCandidato,
  principales: [...conteos].sort((a, b) => b[1] - a[1]).slice(0, 30),
}, null, 2));

if (!aplicar) {
  console.log('Vista previa finalizada. Use --aplicar para guardar las marcas inferidas.');
  await baseDatos.end();
  process.exit(0);
}

const conexion = await baseDatos.getConnection();
try {
  await conexion.beginTransaction();
  const marcaPorNombre = new Map();
  for (const nombre of conteos.keys()) {
    const [existentes] = await conexion.query(
      'SELECT id FROM marcas WHERE nombre = ? LIMIT 1',
      [nombre],
    );
    let marcaId = existentes[0]?.id;
    if (!marcaId) {
      const [resultado] = await conexion.query(
        `INSERT INTO marcas (nombre, origen, esta_confirmada)
         VALUES (?, 'inferencia_nombre', FALSE)`,
        [nombre],
      );
      marcaId = resultado.insertId;
    }
    marcaPorNombre.set(nombre, marcaId);
  }
  for (const candidato of candidatos) {
    await conexion.query(
      'UPDATE productos SET marca_id = ? WHERE id = ? AND marca_id IS NULL',
      [marcaPorNombre.get(candidato.marca), candidato.productoId],
    );
  }
  let variantesConsolidadas = 0;
  for (const [variante, base] of variantesDeLinea) {
    const [[marcaVariante]] = await conexion.query(
      'SELECT id FROM marcas WHERE nombre = ? LIMIT 1', [variante],
    );
    const [[marcaBase]] = await conexion.query(
      'SELECT id FROM marcas WHERE nombre = ? LIMIT 1', [base],
    );
    if (!marcaVariante || !marcaBase) continue;
    const [resultado] = await conexion.query(
      'UPDATE productos SET marca_id = ? WHERE marca_id = ?',
      [marcaBase.id, marcaVariante.id],
    );
    await conexion.query(
      `DELETE FROM marcas WHERE id = ? AND origen = 'inferencia_nombre'
       AND NOT EXISTS (SELECT 1 FROM productos WHERE marca_id = ?)`,
      [marcaVariante.id, marcaVariante.id],
    );
    variantesConsolidadas += resultado.affectedRows;
  }
  await conexion.commit();
  console.log(JSON.stringify({ marcas_creadas_o_reutilizadas: marcaPorNombre.size,
    productos_actualizados: candidatos.length,
    variantes_de_linea_consolidadas: variantesConsolidadas }, null, 2));
} catch (error) {
  await conexion.rollback();
  throw error;
} finally {
  conexion.release();
  await baseDatos.end();
}
