CREATE TABLE cajas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(40) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cajas_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sesiones_caja (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  caja_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'abierta',
  monto_inicial DECIMAL(15,2) NOT NULL,
  monto_contado_cierre DECIMAL(15,2) NULL,
  diferencia_cierre DECIMAL(15,2) NULL,
  fecha_apertura DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fecha_cierre DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_sesiones_caja_usuario_estado (usuario_id, estado),
  CONSTRAINT fk_sesiones_caja_caja FOREIGN KEY (caja_id) REFERENCES cajas (id),
  CONSTRAINT fk_sesiones_caja_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ventas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sesion_caja_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'completada',
  total DECIMAL(15,2) NOT NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_ventas_sesion_fecha (sesion_caja_id, fecha_creacion),
  CONSTRAINT fk_ventas_sesion FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja (id),
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ventas_detalles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  venta_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  cantidad DECIMAL(15,3) NOT NULL,
  precio_unitario DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_venta_producto (venta_id, producto_id),
  CONSTRAINT fk_ventas_detalles_venta FOREIGN KEY (venta_id) REFERENCES ventas (id),
  CONSTRAINT fk_ventas_detalles_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
  CONSTRAINT chk_ventas_detalles_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ventas_pagos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  venta_id BIGINT UNSIGNED NOT NULL,
  medio VARCHAR(30) NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_ventas_pagos_venta FOREIGN KEY (venta_id) REFERENCES ventas (id),
  CONSTRAINT chk_ventas_pagos_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO cajas (codigo, nombre) VALUES ('CAJA_1', 'Caja 1');
