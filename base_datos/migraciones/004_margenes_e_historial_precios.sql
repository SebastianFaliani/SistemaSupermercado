ALTER TABLE categorias
  ADD COLUMN porcentaje_margen_predeterminado DECIMAL(6,3) NOT NULL DEFAULT 30.000
  AFTER descripcion;

ALTER TABLE productos
  ADD COLUMN porcentaje_margen DECIMAL(6,3) NULL AFTER precio_mayorista,
  ADD COLUMN precio_venta_editado_manualmente BOOLEAN NOT NULL DEFAULT FALSE
    AFTER porcentaje_margen;

CREATE TABLE historiales_precios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NULL,
  precio_costo_anterior DECIMAL(15,2) NULL,
  precio_costo_nuevo DECIMAL(15,2) NOT NULL,
  precio_venta_anterior DECIMAL(15,2) NULL,
  precio_venta_nuevo DECIMAL(15,2) NOT NULL,
  porcentaje_margen DECIMAL(6,3) NULL,
  origen VARCHAR(60) NOT NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_historiales_precios_producto_fecha (producto_id, fecha_creacion),
  KEY idx_historiales_precios_usuario (usuario_id),
  CONSTRAINT fk_historiales_precios_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_historiales_precios_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON UPDATE RESTRICT ON DELETE SET NULL,
  CONSTRAINT chk_historiales_precios_valores CHECK (
    precio_costo_nuevo >= 0 AND precio_venta_nuevo >= 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
