CREATE TABLE cuentas_tesoreria (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(30) NOT NULL, moneda VARCHAR(3) NOT NULL DEFAULT 'ARS',
  saldo_inicial DECIMAL(15,2) NOT NULL DEFAULT 0, esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
  observaciones VARCHAR(255) NULL, fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), UNIQUE KEY uq_cuentas_tesoreria_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE movimientos_tesoreria (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, cuenta_tesoreria_id BIGINT UNSIGNED NOT NULL,
  cuenta_destino_id BIGINT UNSIGNED NULL, usuario_id BIGINT UNSIGNED NOT NULL,
  tipo VARCHAR(20) NOT NULL, categoria VARCHAR(60) NOT NULL, concepto VARCHAR(180) NOT NULL,
  monto DECIMAL(15,2) NOT NULL, referencia VARCHAR(100) NULL, fecha DATE NOT NULL,
  transferencia_id CHAR(36) NULL, fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id), KEY idx_movimientos_tesoreria_fecha (cuenta_tesoreria_id, fecha),
  KEY idx_movimientos_transferencia (transferencia_id),
  CONSTRAINT fk_movimiento_cuenta FOREIGN KEY (cuenta_tesoreria_id) REFERENCES cuentas_tesoreria (id),
  CONSTRAINT fk_movimiento_destino FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas_tesoreria (id),
  CONSTRAINT fk_movimiento_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT chk_movimiento_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO cuentas_tesoreria (nombre, tipo, saldo_inicial, observaciones) VALUES
  ('Efectivo general', 'efectivo', 0, 'Fondos fuera de las cajas operativas');
INSERT INTO permisos (codigo, modulo, nombre, descripcion) VALUES
  ('tesoreria.ver', 'tesoreria', 'Ver tesorería', 'Consultar cuentas, saldos y movimientos'),
  ('tesoreria.gestionar', 'tesoreria', 'Gestionar tesorería', 'Crear cuentas, movimientos y transferencias');
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo IN ('tesoreria.ver', 'tesoreria.gestionar')
WHERE r.nombre IN ('administrador', 'supervisor');
