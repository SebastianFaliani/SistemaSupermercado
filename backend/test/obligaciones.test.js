import assert from 'node:assert/strict';
import test from 'node:test';
import { esquemaFacturaProveedor, esquemaPagoProveedor } from '../src/modulos/proveedores/proveedores.esquemas.js';
import { esquemaGasto, esquemaPagoGasto } from '../src/modulos/gastos/gastos.esquemas.js';
import { calcularPrecioVenta } from '../src/modulos/compras/compras.servicio.js';

test('acepta una factura de proveedor válida y rechaza fechas invertidas', () => {
  const factura = { tipo_comprobante: 'factura', numero_comprobante: 'A-0001', fecha_emision: '2026-08-01', fecha_vencimiento: '2026-08-31', total: 125000 };
  assert.equal(esquemaFacturaProveedor.safeParse(factura).success, true);
  assert.equal(esquemaFacturaProveedor.safeParse({ ...factura, fecha_vencimiento: '2026-07-31' }).success, false);
});

test('los pagos de proveedores requieren importe positivo y un medio admitido', () => {
  assert.equal(esquemaPagoProveedor.safeParse({ medio: 'transferencia', monto: 50000, cuenta_tesoreria_id: 1 }).success, true);
  assert.equal(esquemaPagoProveedor.safeParse({ medio: 'transferencia', monto: 50000 }).success, false);
  assert.equal(esquemaPagoProveedor.safeParse({ medio: 'efectivo', monto: 50000, origen_efectivo: 'caja' }).success, true);
  assert.equal(esquemaPagoProveedor.safeParse({ medio: 'efectivo', monto: 50000, origen_efectivo: 'tesoreria', cuenta_tesoreria_id: 1 }).success, true);
  assert.equal(esquemaPagoProveedor.safeParse({ medio: 'efectivo', monto: 50000 }).success, false);
  assert.equal(esquemaPagoProveedor.safeParse({ medio: 'efectivo', monto: 0 }).success, false);
  assert.equal(esquemaPagoProveedor.safeParse({ medio: 'credito', monto: 1000 }).success, false);
});

test('un gasto recurrente exige frecuencia', () => {
  const gasto = { categoria_gasto_id: 1, concepto: 'Servicio de internet', fecha_emision: '2026-08-01', fecha_vencimiento: '2026-08-10', total: 45000, es_recurrente: true };
  assert.equal(esquemaGasto.safeParse(gasto).success, false);
  assert.equal(esquemaGasto.safeParse({ ...gasto, frecuencia: 'mensual' }).success, true);
});

test('los pagos de gastos validan medio e importe', () => {
  assert.equal(esquemaPagoGasto.safeParse({ medio: 'cheque', monto: 25000, cuenta_tesoreria_id: 1 }).success, true);
  assert.equal(esquemaPagoGasto.safeParse({ medio: 'efectivo', monto: 25000, origen_efectivo: 'caja' }).success, true);
  assert.equal(esquemaPagoGasto.safeParse({ medio: 'cheque', monto: 25000 }).success, false);
  assert.equal(esquemaPagoGasto.safeParse({ medio: 'cuenta_corriente', monto: 25000 }).success, false);
  assert.equal(esquemaPagoGasto.safeParse({ medio: 'debito', monto: -1 }).success, false);
});

test('calcula el precio de venta desde el costo y redondea a decenas', () => {
  assert.equal(calcularPrecioVenta(1500, 30), 1950);
  assert.equal(calcularPrecioVenta(1399, 30), 1820);
});
