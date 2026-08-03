CREATE TABLE ubicaciones_stock (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(40) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ubicaciones_stock_codigo (codigo),
  UNIQUE KEY uq_ubicaciones_stock_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE existencias (
  producto_id BIGINT UNSIGNED NOT NULL,
  ubicacion_id BIGINT UNSIGNED NOT NULL,
  cantidad DECIMAL(15,3) NOT NULL DEFAULT 0.000,
  cantidad_reservada DECIMAL(15,3) NOT NULL DEFAULT 0.000,
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (producto_id, ubicacion_id),
  KEY idx_existencias_ubicacion (ubicacion_id),
  CONSTRAINT fk_existencias_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_existencias_ubicacion FOREIGN KEY (ubicacion_id)
    REFERENCES ubicaciones_stock (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_existencias_cantidades CHECK (
    cantidad >= 0 AND cantidad_reservada >= 0 AND cantidad_reservada <= cantidad
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE movimientos_stock (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ubicacion_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  referencia_tipo VARCHAR(60) NULL,
  referencia_id BIGINT UNSIGNED NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_movimientos_stock_ubicacion_fecha (ubicacion_id, fecha_creacion),
  KEY idx_movimientos_stock_usuario (usuario_id),
  KEY idx_movimientos_stock_referencia (referencia_tipo, referencia_id),
  CONSTRAINT fk_movimientos_stock_ubicacion FOREIGN KEY (ubicacion_id)
    REFERENCES ubicaciones_stock (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_movimientos_stock_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE movimientos_stock_detalles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  movimiento_stock_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  cantidad_anterior DECIMAL(15,3) NOT NULL,
  variacion DECIMAL(15,3) NOT NULL,
  cantidad_nueva DECIMAL(15,3) NOT NULL,
  costo_unitario DECIMAL(15,2) NULL,
  PRIMARY KEY (id),
  KEY idx_movimientos_stock_detalles_movimiento (movimiento_stock_id),
  KEY idx_movimientos_stock_detalles_producto (producto_id),
  CONSTRAINT fk_movimientos_stock_detalles_movimiento FOREIGN KEY (movimiento_stock_id)
    REFERENCES movimientos_stock (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_movimientos_stock_detalles_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_movimientos_stock_detalles_cantidades CHECK (
    cantidad_anterior >= 0 AND cantidad_nueva >= 0 AND variacion <> 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ubicaciones_stock (codigo, nombre, tipo)
VALUES ('LOCAL_PRINCIPAL', 'Local principal', 'local');
