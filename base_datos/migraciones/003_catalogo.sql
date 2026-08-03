CREATE TABLE categorias (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  categoria_padre_id BIGINT UNSIGNED NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) NULL,
  esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_padre_nombre (categoria_padre_id, nombre),
  KEY idx_categorias_nombre (nombre),
  CONSTRAINT fk_categorias_padre FOREIGN KEY (categoria_padre_id)
    REFERENCES categorias (id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE marcas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_marcas_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE unidades_medida (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(60) NOT NULL,
  abreviatura VARCHAR(15) NOT NULL,
  permite_decimales BOOLEAN NOT NULL DEFAULT FALSE,
  esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_unidades_medida_nombre (nombre),
  UNIQUE KEY uq_unidades_medida_abreviatura (abreviatura)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE productos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  categoria_id BIGINT UNSIGNED NOT NULL,
  marca_id BIGINT UNSIGNED NULL,
  unidad_medida_id BIGINT UNSIGNED NOT NULL,
  codigo_interno VARCHAR(40) NULL,
  nombre VARCHAR(180) NOT NULL,
  descripcion TEXT NULL,
  contenido_neto DECIMAL(12,3) NULL,
  precio_costo DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  precio_venta DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  precio_mayorista DECIMAL(15,2) NULL,
  cantidad_minima_mayorista DECIMAL(12,3) NULL,
  stock_minimo DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  es_pesable BOOLEAN NOT NULL DEFAULT FALSE,
  esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
  imagen_url VARCHAR(500) NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_productos_codigo_interno (codigo_interno),
  KEY idx_productos_nombre (nombre),
  KEY idx_productos_categoria (categoria_id),
  KEY idx_productos_marca (marca_id),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_productos_marca FOREIGN KEY (marca_id)
    REFERENCES marcas (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_productos_unidad FOREIGN KEY (unidad_medida_id)
    REFERENCES unidades_medida (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_productos_precios CHECK (
    precio_costo >= 0 AND precio_venta >= 0 AND
    (precio_mayorista IS NULL OR precio_mayorista >= 0)
  ),
  CONSTRAINT chk_productos_cantidades CHECK (
    contenido_neto IS NULL OR contenido_neto > 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE productos_codigos_barra (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id BIGINT UNSIGNED NOT NULL,
  codigo_barra VARCHAR(50) NOT NULL,
  es_principal BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_productos_codigos_codigo (codigo_barra),
  KEY idx_productos_codigos_producto (producto_id),
  CONSTRAINT fk_productos_codigos_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO unidades_medida (nombre, abreviatura, permite_decimales) VALUES
  ('unidad', 'u', FALSE),
  ('kilogramo', 'kg', TRUE),
  ('gramo', 'g', TRUE),
  ('litro', 'l', TRUE),
  ('mililitro', 'ml', TRUE),
  ('metro', 'm', TRUE),
  ('paquete', 'paq', FALSE),
  ('caja', 'caja', FALSE);
