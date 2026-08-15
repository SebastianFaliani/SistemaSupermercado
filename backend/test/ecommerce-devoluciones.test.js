import assert from 'node:assert/strict';
import test from 'node:test';

import {
  esquemaDevolucionPedido,
  esquemaPreparacion,
  esquemaReembolso,
} from '../src/modulos/ecommerce/ecommerce.esquemas.js';

test('la preparación permite reducir o quitar productos del pedido', () => {
  const resultado = esquemaPreparacion.safeParse({
    items: [
      { detalle_id: 1, cantidad_confirmada: 2, producto_sustituto_id: null },
      { detalle_id: 2, cantidad_confirmada: 0, producto_sustituto_id: null },
    ],
  });
  assert.equal(resultado.success, true);
});

test('el reembolso exige importe positivo, motivo y cuenta', () => {
  assert.equal(
    esquemaReembolso.safeParse({
      monto: 1500,
      motivo: 'Ajuste de preparación',
      cuenta_tesoreria_id: 1,
    }).success,
    true,
  );
  assert.equal(
    esquemaReembolso.safeParse({
      monto: 0,
      motivo: 'Ajuste de preparación',
      cuenta_tesoreria_id: 1,
    }).success,
    false,
  );
});

test('la devolución parcial requiere al menos un artículo válido', () => {
  const base = {
    motivo: 'El cliente devolvió un producto',
    cuenta_tesoreria_id: 1,
    items: [{ detalle_id: 10, cantidad: 1, reintegra_stock: true }],
  };
  assert.equal(esquemaDevolucionPedido.safeParse(base).success, true);
  assert.equal(
    esquemaDevolucionPedido.safeParse({ ...base, items: [] }).success,
    false,
  );
  assert.equal(
    esquemaDevolucionPedido.safeParse({
      ...base,
      items: [{ detalle_id: 10, cantidad: 0, reintegra_stock: true }],
    }).success,
    false,
  );
});
