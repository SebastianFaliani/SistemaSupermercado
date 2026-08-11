ALTER TABLE pagos_proveedores
  ADD COLUMN cuenta_tesoreria_id BIGINT UNSIGNED NULL AFTER sesion_caja_id,
  ADD KEY idx_pagos_proveedor_cuenta (cuenta_tesoreria_id),
  ADD CONSTRAINT fk_pagos_proveedor_cuenta FOREIGN KEY (cuenta_tesoreria_id) REFERENCES cuentas_tesoreria (id);

ALTER TABLE movimientos_tesoreria
  ADD COLUMN pago_proveedor_id BIGINT UNSIGNED NULL AFTER transferencia_id,
  ADD UNIQUE KEY uq_movimiento_pago_proveedor (pago_proveedor_id),
  ADD CONSTRAINT fk_movimiento_pago_proveedor FOREIGN KEY (pago_proveedor_id) REFERENCES pagos_proveedores (id);
