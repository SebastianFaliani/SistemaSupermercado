import { baseDatos } from '../../configuracion/base-datos.js';

const campos = ['nombre', 'tipo_documento', 'numero_documento', 'telefono', 'correo_electronico', 'direccion', 'observaciones'];
const valor = (datos, campo) => datos[campo] || null;
export async function listarClientes(consulta) {
  const condiciones = []; const parametros = [];
  if (consulta.buscar) { const patron = `%${consulta.buscar}%`; condiciones.push('(nombre LIKE ? OR numero_documento LIKE ? OR telefono LIKE ? OR correo_electronico LIKE ?)'); parametros.push(patron, patron, patron, patron); }
  if (consulta.estado !== 'todos') { condiciones.push('esta_activo = ?'); parametros.push(consulta.estado === 'activos'); }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''; const desplazamiento = (consulta.pagina - 1) * consulta.limite;
  const [[datos], [conteo]] = await Promise.all([baseDatos.query(`SELECT id, ${campos.join(', ')}, esta_activo, fecha_creacion FROM clientes ${donde} ORDER BY nombre LIMIT ? OFFSET ?`, [...parametros, consulta.limite, desplazamiento]), baseDatos.query(`SELECT COUNT(*) AS total FROM clientes ${donde}`, parametros)]);
  return { datos, total: Number(conteo[0].total), pagina: consulta.pagina, limite: consulta.limite };
}
export async function crearCliente(datos) { const [resultado] = await baseDatos.query(`INSERT INTO clientes (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`, campos.map((campo) => valor(datos, campo))); return { id: resultado.insertId }; }
export async function editarCliente(id, datos) { const [resultado] = await baseDatos.query(`UPDATE clientes SET ${campos.map((campo) => `${campo} = ?`).join(', ')}, esta_activo = ? WHERE id = ?`, [...campos.map((campo) => valor(datos, campo)), datos.esta_activo, id]); if (!resultado.affectedRows) { const error = new Error('No se encontró el cliente'); error.codigoPublico = 'NO_ENCONTRADO'; throw error; } return { id }; }
