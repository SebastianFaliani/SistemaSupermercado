CREATE TABLE ordenes_compra (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  proveedor_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'borrador',
  fecha_esperada DATE NULL,
  observaciones VARCHAR(500) NULL,
  total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_ordenes_compra_proveedor (proveedor_id),
  KEY idx_ordenes_compra_estado_fecha (estado, fecha_creacion),
  CONSTRAINT fk_ordenes_compra_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id),
  CONSTRAINT fk_ordenes_compra_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ordenes_compra_detalles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_compra_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  cantidad DECIMAL(15,3) NOT NULL,
  costo_unitario DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orden_producto (orden_compra_id, producto_id),
  CONSTRAINT fk_orden_detalle_orden FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra (id) ON DELETE CASCADE,
  CONSTRAINT fk_orden_detalle_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
  CONSTRAINT chk_orden_detalle_valores CHECK (cantidad > 0 AND costo_unitario >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
