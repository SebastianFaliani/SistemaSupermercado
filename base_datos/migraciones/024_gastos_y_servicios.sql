CREATE TABLE categorias_gastos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id), UNIQUE KEY uq_categorias_gastos_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gastos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  categoria_gasto_id BIGINT UNSIGNED NOT NULL,
  proveedor_id BIGINT UNSIGNED NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  concepto VARCHAR(180) NOT NULL,
  numero_comprobante VARCHAR(80) NULL,
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  saldo_pendiente DECIMAL(15,2) NOT NULL,
  es_recurrente BOOLEAN NOT NULL DEFAULT FALSE,
  frecuencia VARCHAR(20) NULL,
  observaciones VARCHAR(500) NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  gasto_origen_id BIGINT UNSIGNED NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_gastos_estado_vencimiento (estado, fecha_vencimiento),
  CONSTRAINT fk_gastos_categoria FOREIGN KEY (categoria_gasto_id) REFERENCES categorias_gastos (id),
  CONSTRAINT fk_gastos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id),
  CONSTRAINT fk_gastos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_gastos_origen FOREIGN KEY (gasto_origen_id) REFERENCES gastos (id),
  CONSTRAINT chk_gastos_total CHECK (total > 0 AND saldo_pendiente >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pagos_gastos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gasto_id BIGINT UNSIGNED NOT NULL,
  sesion_caja_id BIGINT UNSIGNED NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  medio VARCHAR(30) NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  referencia VARCHAR(100) NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_pagos_gastos_fecha (fecha_creacion),
  CONSTRAINT fk_pagos_gasto FOREIGN KEY (gasto_id) REFERENCES gastos (id),
  CONSTRAINT fk_pagos_gasto_sesion FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja (id),
  CONSTRAINT fk_pagos_gasto_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT chk_pagos_gasto_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categorias_gastos (nombre) VALUES
  ('Alquiler'), ('Energía eléctrica'), ('Gas'), ('Agua'), ('Internet y telefonía'),
  ('Impuestos y tasas'), ('Mantenimiento'), ('Combustible'), ('Limpieza e insumos'),
  ('Honorarios'), ('Otros gastos');

INSERT INTO permisos (codigo, modulo, nombre, descripcion) VALUES
  ('gastos.ver', 'gastos', 'Ver gastos y servicios', 'Consultar obligaciones, pagos y vencimientos'),
  ('gastos.gestionar', 'gastos', 'Gestionar gastos y servicios', 'Registrar gastos, renovaciones y pagos');

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo IN ('gastos.ver', 'gastos.gestionar')
WHERE r.nombre IN ('administrador', 'supervisor');
