ALTER TABLE clientes
  ADD COLUMN credito_habilitado BOOLEAN NOT NULL DEFAULT FALSE AFTER observaciones,
  ADD COLUMN limite_credito DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER credito_habilitado,
  ADD COLUMN dias_vencimiento INT UNSIGNED NOT NULL DEFAULT 30 AFTER limite_credito;

ALTER TABLE ventas
  ADD COLUMN cliente_id BIGINT UNSIGNED NULL AFTER usuario_id,
  ADD COLUMN saldo_pendiente DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER total,
  ADD COLUMN fecha_vencimiento DATE NULL AFTER saldo_pendiente,
  ADD KEY idx_ventas_cliente_saldo (cliente_id, saldo_pendiente),
  ADD CONSTRAINT fk_ventas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id);

CREATE TABLE cobranzas_clientes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id BIGINT UNSIGNED NOT NULL,
  sesion_caja_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  medio VARCHAR(30) NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  observaciones VARCHAR(255) NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_cobranzas_cliente_fecha (cliente_id, fecha_creacion),
  CONSTRAINT fk_cobranzas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
  CONSTRAINT fk_cobranzas_sesion FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja (id),
  CONSTRAINT fk_cobranzas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT chk_cobranzas_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cobranzas_clientes_aplicaciones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cobranza_id BIGINT UNSIGNED NOT NULL,
  venta_id BIGINT UNSIGNED NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cobranza_venta (cobranza_id, venta_id),
  CONSTRAINT fk_aplicacion_cobranza FOREIGN KEY (cobranza_id) REFERENCES cobranzas_clientes (id),
  CONSTRAINT fk_aplicacion_venta FOREIGN KEY (venta_id) REFERENCES ventas (id),
  CONSTRAINT chk_aplicacion_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE movimientos_cuenta_clientes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  debe DECIMAL(15,2) NOT NULL DEFAULT 0,
  haber DECIMAL(15,2) NOT NULL DEFAULT 0,
  referencia_tipo VARCHAR(30) NOT NULL,
  referencia_id BIGINT UNSIGNED NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  fecha_vencimiento DATE NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_movimientos_cuenta_cliente_fecha (cliente_id, fecha_creacion),
  CONSTRAINT fk_movimientos_cuenta_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
  CONSTRAINT fk_movimientos_cuenta_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT chk_movimiento_cuenta_importe CHECK ((debe > 0 AND haber = 0) OR (haber > 0 AND debe = 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permisos (codigo, modulo, nombre, descripcion) VALUES
  ('cuentas_clientes.ver', 'clientes', 'Ver cuentas corrientes', 'Consultar saldos y movimientos de clientes'),
  ('cuentas_clientes.cobrar', 'clientes', 'Registrar cobranzas', 'Registrar pagos de cuentas corrientes');

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo IN ('cuentas_clientes.ver', 'cuentas_clientes.cobrar')
WHERE r.nombre IN ('administrador', 'supervisor');

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo = 'cuentas_clientes.cobrar'
WHERE r.nombre = 'cajero';
