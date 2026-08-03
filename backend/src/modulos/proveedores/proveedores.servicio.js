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
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const desplazamiento = (consulta.pagina - 1) * consulta.limite;
  const [[datos], [conteo]] = await Promise.all([
    baseDatos.query(
      `SELECT id, ${campos.join(', ')}, esta_activo FROM proveedores ${donde}
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
