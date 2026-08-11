ALTER TABLE gastos
  ADD COLUMN usuario_anulacion_id BIGINT UNSIGNED NULL AFTER estado,
  ADD COLUMN motivo_anulacion VARCHAR(255) NULL AFTER usuario_anulacion_id,
  ADD COLUMN fecha_anulacion DATETIME(3) NULL AFTER motivo_anulacion,
  ADD UNIQUE KEY uq_gasto_periodo_siguiente (gasto_origen_id),
  ADD CONSTRAINT fk_gastos_usuario_anulacion FOREIGN KEY (usuario_anulacion_id) REFERENCES usuarios (id);

ALTER TABLE pagos_gastos
  ADD COLUMN cuenta_tesoreria_id BIGINT UNSIGNED NULL AFTER sesion_caja_id,
  ADD KEY idx_pagos_gastos_cuenta (cuenta_tesoreria_id),
  ADD CONSTRAINT fk_pagos_gastos_cuenta FOREIGN KEY (cuenta_tesoreria_id) REFERENCES cuentas_tesoreria (id);

ALTER TABLE movimientos_tesoreria
  ADD COLUMN pago_gasto_id BIGINT UNSIGNED NULL AFTER pago_proveedor_id,
  ADD UNIQUE KEY uq_movimiento_pago_gasto (pago_gasto_id),
  ADD CONSTRAINT fk_movimiento_pago_gasto FOREIGN KEY (pago_gasto_id) REFERENCES pagos_gastos (id);
