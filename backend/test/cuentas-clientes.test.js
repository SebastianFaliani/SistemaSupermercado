import assert from 'node:assert/strict';
import test from 'node:test';
import { esquemaCrearCliente, esquemaCobranza } from '../src/modulos/clientes/clientes.esquemas.js';
import { esquemaVenta } from '../src/modulos/ventas/ventas.esquemas.js';

test('acepta un cliente con configuración de crédito válida', () => {
  const resultado = esquemaCrearCliente.safeParse({ nombre: 'Cliente de prueba', credito_habilitado: true, limite_credito: 150000, dias_vencimiento: 30 });
  assert.equal(resultado.success, true);
});

test('rechaza límites y vencimientos inválidos', () => {
  const resultado = esquemaCrearCliente.safeParse({ nombre: 'Cliente de prueba', credito_habilitado: true, limite_credito: -1, dias_vencimiento: 0 });
  assert.equal(resultado.success, false);
});

test('una venta puede no tener pagos para resolverse como crédito', () => {
  const resultado = esquemaVenta.safeParse({ cliente_id: 1, detalles: [{ producto_id: 1, cantidad: 2 }], pagos: [] });
  assert.equal(resultado.success, true);
});

test('una venta en efectivo conserva lo recibido y valida el vuelto', () => {
  const base = { detalles: [{ producto_id: 1, cantidad: 1 }], pagos: [{ medio: 'efectivo', monto: 6300 }] };
  assert.equal(esquemaVenta.safeParse({ ...base, efectivo_recibido: 7000 }).success, true);
  assert.equal(esquemaVenta.safeParse({ ...base, efectivo_recibido: 6000 }).success, false);
  assert.equal(esquemaVenta.safeParse({ detalles: base.detalles, pagos: [{ medio: 'debito', monto: 6300 }], efectivo_recibido: 7000 }).success, false);
});

test('una cobranza requiere importe positivo y medio válido', () => {
  assert.equal(esquemaCobranza.safeParse({ medio: 'efectivo', monto: 1000 }).success, true);
  assert.equal(esquemaCobranza.safeParse({ medio: 'cuenta_corriente', monto: 1000 }).success, false);
  assert.equal(esquemaCobranza.safeParse({ medio: 'efectivo', monto: 0 }).success, false);
});
