CREATE TABLE proveedores (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  razon_social VARCHAR(160) NOT NULL,
  nombre_fantasia VARCHAR(160) NULL,
  cuit VARCHAR(13) NULL,
  condicion_iva VARCHAR(60) NULL,
  persona_contacto VARCHAR(120) NULL,
  telefono VARCHAR(30) NULL,
  correo_electronico VARCHAR(254) NULL,
  direccion VARCHAR(255) NULL,
  observaciones VARCHAR(500) NULL,
  esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_proveedores_cuit (cuit),
  KEY idx_proveedores_razon_social (razon_social),
  KEY idx_proveedores_nombre_fantasia (nombre_fantasia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
