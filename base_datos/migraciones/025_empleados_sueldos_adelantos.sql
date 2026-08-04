ALTER TABLE empleados
  ADD COLUMN legajo VARCHAR(30) NULL AFTER id,
  ADD COLUMN cargo VARCHAR(100) NULL AFTER direccion,
  ADD COLUMN modalidad_pago VARCHAR(20) NOT NULL DEFAULT 'mensual' AFTER cargo,
  ADD COLUMN sueldo_base DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER modalidad_pago,
  ADD COLUMN cbu_alias VARCHAR(100) NULL AFTER sueldo_base,
  ADD UNIQUE KEY uq_empleados_legajo (legajo);

CREATE TABLE adelantos_empleados (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, empleado_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL, sesion_caja_id BIGINT UNSIGNED NULL,
  fecha DATE NOT NULL, monto DECIMAL(15,2) NOT NULL, medio VARCHAR(30) NOT NULL,
  referencia VARCHAR(100) NULL, observaciones VARCHAR(255) NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', liquidacion_id BIGINT UNSIGNED NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (id),
  KEY idx_adelantos_empleado_estado (empleado_id, estado),
  CONSTRAINT fk_adelantos_empleado FOREIGN KEY (empleado_id) REFERENCES empleados (id),
  CONSTRAINT fk_adelantos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_adelantos_sesion FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja (id),
  CONSTRAINT chk_adelantos_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE liquidaciones_sueldos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, empleado_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL, periodo_desde DATE NOT NULL, periodo_hasta DATE NOT NULL,
  sueldo_base DECIMAL(15,2) NOT NULL, adicionales DECIMAL(15,2) NOT NULL DEFAULT 0,
  descuentos DECIMAL(15,2) NOT NULL DEFAULT 0, adelantos_aplicados DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_neto DECIMAL(15,2) NOT NULL, saldo_pendiente DECIMAL(15,2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', observaciones VARCHAR(500) NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (id),
  UNIQUE KEY uq_liquidacion_empleado_periodo (empleado_id, periodo_desde, periodo_hasta),
  KEY idx_liquidaciones_estado (estado, periodo_hasta),
  CONSTRAINT fk_liquidaciones_empleado FOREIGN KEY (empleado_id) REFERENCES empleados (id),
  CONSTRAINT fk_liquidaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT chk_liquidacion_fechas CHECK (periodo_hasta >= periodo_desde),
  CONSTRAINT chk_liquidacion_importes CHECK (sueldo_base >= 0 AND adicionales >= 0 AND descuentos >= 0 AND adelantos_aplicados >= 0 AND total_neto >= 0 AND saldo_pendiente >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE adelantos_empleados ADD CONSTRAINT fk_adelantos_liquidacion FOREIGN KEY (liquidacion_id) REFERENCES liquidaciones_sueldos (id);

CREATE TABLE pagos_sueldos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, liquidacion_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL, sesion_caja_id BIGINT UNSIGNED NULL,
  medio VARCHAR(30) NOT NULL, monto DECIMAL(15,2) NOT NULL, referencia VARCHAR(100) NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (id),
  CONSTRAINT fk_pagos_sueldo_liquidacion FOREIGN KEY (liquidacion_id) REFERENCES liquidaciones_sueldos (id),
  CONSTRAINT fk_pagos_sueldo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_pagos_sueldo_sesion FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja (id),
  CONSTRAINT chk_pagos_sueldo_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permisos (codigo, modulo, nombre, descripcion) VALUES
  ('empleados.ver', 'empleados', 'Ver empleados y nómina', 'Consultar legajos, liquidaciones y adelantos'),
  ('empleados.gestionar', 'empleados', 'Gestionar empleados y nómina', 'Crear empleados, liquidaciones, adelantos y pagos');
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo IN ('empleados.ver', 'empleados.gestionar')
WHERE r.nombre IN ('administrador', 'supervisor');
