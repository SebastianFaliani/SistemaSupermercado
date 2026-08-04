import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { baseDatos } from '../src/configuracion/base-datos.js';

if (process.env.CONFIRMAR_LIMPIEZA !== 'SI') {
  console.error('Operación cancelada. Ejecutá con CONFIRMAR_LIMPIEZA=SI.');
  process.exitCode = 1;
} else {
  const tablasOperacion = [
    'pagos_proveedores_aplicaciones', 'cobranzas_clientes_aplicaciones',
    'devoluciones_ventas_pagos', 'devoluciones_ventas_detalles', 'devoluciones_ventas',
    'ventas_pagos', 'ventas_detalles', 'movimientos_cuenta_clientes', 'cobranzas_clientes', 'ventas',
    'pagos_proveedores', 'facturas_proveedores', 'ordenes_compra_detalles', 'ordenes_compra',
    'pagos_gastos', 'gastos', 'pagos_sueldos', 'adelantos_empleados', 'liquidaciones_sueldos',
    'movimientos_tesoreria', 'movimientos_caja', 'sesiones_caja',
    'movimientos_stock_detalles', 'movimientos_stock', 'existencias', 'auditorias',
  ];
  const tablasConservadas = [
    'usuarios', 'usuarios_roles', 'roles', 'roles_permisos', 'permisos',
    'clientes', 'proveedores', 'empleados', 'productos', 'productos_codigos_barra',
    'categorias', 'marcas', 'unidades_medida', 'historiales_precios',
    'ubicaciones_stock', 'cajas', 'categorias_gastos', 'cuentas_tesoreria', 'migraciones',
  ];
  const conexion = await baseDatos.getConnection();
  try {
    const [tablas] = await conexion.query('SHOW TABLES');
    const nombres = tablas.map((fila) => Object.values(fila)[0]);
    const respaldo = { creado_en: new Date().toISOString(), tablas: {} };
    for (const tabla of nombres) {
      const [filas] = await conexion.query(`SELECT * FROM \`${tabla}\``);
      respaldo.tablas[tabla] = filas;
    }
    const carpeta = resolve('backups');
    await mkdir(carpeta, { recursive: true });
    const marca = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
    const archivo = resolve(carpeta, `antes_puesta_en_marcha_${marca}.json.gz`);
    const origen = async function* () { yield JSON.stringify(respaldo); };
    await pipeline(origen(), createGzip({ level: 9 }), createWriteStream(archivo));

    await conexion.beginTransaction();
    await conexion.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const tabla of tablasOperacion) await conexion.query(`DELETE FROM \`${tabla}\``);
    await conexion.query('UPDATE cuentas_tesoreria SET saldo_inicial = 0');
    await conexion.query('SET FOREIGN_KEY_CHECKS = 1');
    await conexion.commit();

    for (const tabla of tablasOperacion) await conexion.query(`ALTER TABLE \`${tabla}\` AUTO_INCREMENT = 1`);
    const resumen = {};
    for (const tabla of tablasConservadas) {
      const [[fila]] = await conexion.query(`SELECT COUNT(*) AS cantidad FROM \`${tabla}\``);
      resumen[tabla] = Number(fila.cantidad);
    }
    console.log(`Respaldo creado: ${archivo}`);
    console.log('Base operativa limpia. Registros conservados:');
    console.table(resumen);
  } catch (error) {
    try { await conexion.query('SET FOREIGN_KEY_CHECKS = 1'); await conexion.rollback(); } catch { /* sin acción */ }
    throw error;
  } finally {
    conexion.release();
    await baseDatos.end();
  }
}
