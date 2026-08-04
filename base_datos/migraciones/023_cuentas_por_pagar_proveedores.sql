CREATE TABLE facturas_proveedores (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  proveedor_id BIGINT UNSIGNED NOT NULL,
  orden_compra_id BIGINT UNSIGNED NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  tipo_comprobante VARCHAR(20) NOT NULL DEFAULT 'factura',
  numero_comprobante VARCHAR(80) NOT NULL,
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  saldo_pendiente DECIMAL(15,2) NOT NULL,
  observaciones VARCHAR(500) NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_factura_proveedor_numero (proveedor_id, tipo_comprobante, numero_comprobante),
  KEY idx_facturas_proveedor_saldo (proveedor_id, saldo_pendiente),
  KEY idx_facturas_vencimiento (estado, fecha_vencimiento),
  CONSTRAINT fk_facturas_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id),
  CONSTRAINT fk_facturas_orden FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra (id),
  CONSTRAINT fk_facturas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT chk_facturas_total CHECK (total > 0 AND saldo_pendiente >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pagos_proveedores (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  proveedor_id BIGINT UNSIGNED NOT NULL,
  sesion_caja_id BIGINT UNSIGNED NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  medio VARCHAR(30) NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  referencia VARCHAR(100) NULL,
  observaciones VARCHAR(255) NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_pagos_proveedor_fecha (proveedor_id, fecha_creacion),
  CONSTRAINT fk_pagos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id),
  CONSTRAINT fk_pagos_proveedor_sesion FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja (id),
  CONSTRAINT fk_pagos_proveedor_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT chk_pagos_proveedor_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pagos_proveedores_aplicaciones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pago_proveedor_id BIGINT UNSIGNED NOT NULL,
  factura_proveedor_id BIGINT UNSIGNED NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pago_factura (pago_proveedor_id, factura_proveedor_id),
  CONSTRAINT fk_aplicacion_pago_proveedor FOREIGN KEY (pago_proveedor_id) REFERENCES pagos_proveedores (id),
  CONSTRAINT fk_aplicacion_factura_proveedor FOREIGN KEY (factura_proveedor_id) REFERENCES facturas_proveedores (id),
  CONSTRAINT chk_aplicacion_pago_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permisos (codigo, modulo, nombre, descripcion) VALUES
  ('cuentas_proveedores.ver', 'compras', 'Ver cuentas de proveedores', 'Consultar facturas, saldos y vencimientos'),
  ('cuentas_proveedores.gestionar', 'compras', 'Gestionar cuentas de proveedores', 'Registrar facturas y pagos');

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo IN ('cuentas_proveedores.ver', 'cuentas_proveedores.gestionar')
WHERE r.nombre IN ('administrador', 'supervisor');
