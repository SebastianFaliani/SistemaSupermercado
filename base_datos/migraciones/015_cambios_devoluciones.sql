CREATE TABLE devoluciones_ventas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  venta_id BIGINT UNSIGNED NOT NULL,
  sesion_caja_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  total_devuelto DECIMAL(15,2) NOT NULL,
  total_reemplazo DECIMAL(15,2) NOT NULL,
  diferencia DECIMAL(15,2) NOT NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_devoluciones_venta (venta_id),
  CONSTRAINT fk_devoluciones_venta FOREIGN KEY (venta_id) REFERENCES ventas (id),
  CONSTRAINT fk_devoluciones_sesion FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja (id),
  CONSTRAINT fk_devoluciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE devoluciones_ventas_detalles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  devolucion_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  cantidad DECIMAL(15,3) NOT NULL,
  precio_unitario DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  reintegra_stock BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  CONSTRAINT fk_devolucion_detalle FOREIGN KEY (devolucion_id) REFERENCES devoluciones_ventas (id),
  CONSTRAINT fk_devolucion_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
  CONSTRAINT chk_devolucion_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE devoluciones_ventas_pagos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  devolucion_id BIGINT UNSIGNED NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  medio VARCHAR(30) NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_devolucion_pago FOREIGN KEY (devolucion_id) REFERENCES devoluciones_ventas (id),
  CONSTRAINT chk_devolucion_pago_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
