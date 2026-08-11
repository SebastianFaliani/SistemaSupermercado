ALTER TABLE adelantos_empleados
  ADD COLUMN cuenta_tesoreria_id BIGINT UNSIGNED NULL AFTER sesion_caja_id,
  ADD CONSTRAINT fk_adelantos_cuenta_tesoreria FOREIGN KEY (cuenta_tesoreria_id) REFERENCES cuentas_tesoreria(id);

ALTER TABLE pagos_sueldos
  ADD COLUMN cuenta_tesoreria_id BIGINT UNSIGNED NULL AFTER sesion_caja_id,
  ADD CONSTRAINT fk_pagos_sueldos_cuenta_tesoreria FOREIGN KEY (cuenta_tesoreria_id) REFERENCES cuentas_tesoreria(id);
