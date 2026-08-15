CREATE TABLE promociones_ecommerce_categorias (
  promocion_id BIGINT UNSIGNED NOT NULL,
  categoria_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (promocion_id, categoria_id),
  CONSTRAINT fk_promociones_ecommerce_categorias_promocion FOREIGN KEY (promocion_id)
    REFERENCES promociones_ecommerce (id) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_promociones_ecommerce_categorias_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias (id) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
