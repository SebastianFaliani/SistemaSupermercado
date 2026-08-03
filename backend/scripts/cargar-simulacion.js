import bcrypt from 'bcryptjs';
import { baseDatos } from '../src/configuracion/base-datos.js';
import { crearCompra, recibirCompra } from '../src/modulos/compras/compras.servicio.js';

const CLAVE = process.env.SIMULACION_CLAVE;
if (!CLAVE || CLAVE.length < 12) {
  throw new Error('SIMULACION_CLAVE debe tener al menos 12 caracteres');
}
const usuarios = [
  ['cajero.prueba', 'Cajero', 'Prueba', 'cajero'],
  ['deposito.prueba', 'Depósito', 'Prueba', 'deposito'],
  ['supervisor.prueba', 'Supervisor', 'Prueba', 'supervisor'],
];

async function asegurarUsuario([nombreUsuario, nombres, apellidos, rol]) {
  const [[existente]] = await baseDatos.query('SELECT id FROM usuarios WHERE nombre_usuario = ?', [nombreUsuario]);
  if (existente) return existente.id;
  const [empleado] = await baseDatos.query(`INSERT INTO empleados
    (nombres, apellidos, fecha_ingreso) VALUES (?, ?, CURRENT_DATE)`, [nombres, apellidos]);
  const [usuario] = await baseDatos.query(`INSERT INTO usuarios
    (empleado_id, nombre_usuario, clave_hash, requiere_cambio_clave) VALUES (?, ?, ?, TRUE)`,
  [empleado.insertId, nombreUsuario, await bcrypt.hash(CLAVE, 12)]);
  const [[filaRol]] = await baseDatos.query('SELECT id FROM roles WHERE nombre = ?', [rol]);
  await baseDatos.query('INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES (?, ?)', [usuario.insertId, filaRol.id]);
  return usuario.insertId;
}

try {
  const [[yaExiste]] = await baseDatos.query("SELECT id FROM ordenes_compra WHERE observaciones LIKE 'SIMULACIÓN 2026:%' LIMIT 1");
  if (yaExiste) { console.log('La simulación ya estaba cargada; no se duplicó.'); process.exitCode = 0; }
  else {
    const idsUsuarios = [];
    for (const usuario of usuarios) idsUsuarios.push(await asegurarUsuario(usuario));
    const proveedores = [];
    for (let i = 1; i <= 3; i += 1) {
      const razon = `SIMULACIÓN Distribuidora ${i}`;
      await baseDatos.query(`INSERT INTO proveedores (razon_social, nombre_fantasia, persona_contacto,
        telefono, observaciones) VALUES (?, ?, 'Contacto de prueba', '0000-000000', 'SIMULACIÓN 2026')`,
      [razon, `Proveedor prueba ${i}`]);
      const [[proveedor]] = await baseDatos.query('SELECT id FROM proveedores WHERE razon_social = ?', [razon]);
      proveedores.push(proveedor.id);
    }
    const [productos] = await baseDatos.query(`SELECT id, precio_costo FROM productos
      WHERE esta_activo = TRUE ORDER BY id LIMIT 240`);
    if (productos.length < 200) throw new Error('No hay suficientes productos para la simulación');
    for (let i = 0; i < productos.length; i += 1) {
      await baseDatos.query('UPDATE productos SET stock_minimo = ? WHERE id = ?', [5 + (i % 11), productos[i].id]);
    }
    const [[administrador]] = await baseDatos.query("SELECT id FROM usuarios WHERE nombre_usuario = 'administrador'");
    for (let grupo = 0; grupo < 3; grupo += 1) {
      const lote = productos.slice(grupo * 80, grupo * 80 + 80);
      const compra = await crearCompra({ proveedor_id: proveedores[grupo],
        fecha_esperada: null, observaciones: `SIMULACIÓN 2026: compra ${grupo + 1}`,
        modalidad_entrega: grupo === 1 ? 'retiro_propio' : 'entrega_proveedor',
        responsable_retiro: grupo === 1 ? 'Sebastian Faliani' : null,
        numero_comprobante: `SIM-${grupo + 1}`, detalles: lote.map((producto, indice) => ({
          producto_id: producto.id, cantidad: 20 + (indice % 31),
          costo_unitario: Number(producto.precio_costo),
        })) }, administrador.id);
      await recibirCompra(compra.id, idsUsuarios[1]);
    }
    console.log(JSON.stringify({ productos_con_stock: productos.length, compras_recibidas: 3,
      proveedores: 3, usuarios_prueba: usuarios.map(([nombre]) => nombre) }));
  }
} finally { await baseDatos.end(); }
