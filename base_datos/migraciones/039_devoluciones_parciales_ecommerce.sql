CREATE TABLE devoluciones_ecommerce (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id BIGINT UNSIGNED NOT NULL,
  venta_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  reembolso_id BIGINT UNSIGNED NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_devoluciones_ecommerce_pedido (pedido_id, fecha_creacion),
  CONSTRAINT fk_devoluciones_ecommerce_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos_ecommerce(id),
  CONSTRAINT fk_devoluciones_ecommerce_venta FOREIGN KEY (venta_id) REFERENCES ventas(id),
  CONSTRAINT fk_devoluciones_ecommerce_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_devoluciones_ecommerce_reembolso FOREIGN KEY (reembolso_id) REFERENCES reembolsos_ecommerce(id),
  CONSTRAINT chk_devoluciones_ecommerce_total CHECK (total > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
;

CREATE TABLE devoluciones_ecommerce_detalles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  devolucion_id BIGINT UNSIGNED NOT NULL,
  pedido_detalle_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  cantidad DECIMAL(15,3) NOT NULL,
  precio_unitario DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  reintegra_stock BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  CONSTRAINT fk_devoluciones_ecommerce_detalle_devolucion FOREIGN KEY (devolucion_id) REFERENCES devoluciones_ecommerce(id),
  CONSTRAINT fk_devoluciones_ecommerce_detalle_pedido FOREIGN KEY (pedido_detalle_id) REFERENCES pedidos_ecommerce_detalles(id),
  CONSTRAINT fk_devoluciones_ecommerce_detalle_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT chk_devoluciones_ecommerce_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_devoluciones_ecommerce_subtotal CHECK (subtotal > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
;
