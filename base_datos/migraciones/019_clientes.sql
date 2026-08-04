CREATE TABLE clientes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(160) NOT NULL,
  tipo_documento VARCHAR(10) NULL,
  numero_documento VARCHAR(20) NULL,
  telefono VARCHAR(30) NULL,
  correo_electronico VARCHAR(254) NULL,
  direccion VARCHAR(255) NULL,
  observaciones VARCHAR(500) NULL,
  esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_clientes_documento (tipo_documento, numero_documento),
  KEY idx_clientes_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO permisos (codigo, modulo, nombre, descripcion) VALUES ('clientes.ver', 'clientes', 'Ver clientes', 'Consultar el padrón de clientes'), ('clientes.gestionar', 'clientes', 'Gestionar clientes', 'Crear y modificar clientes');
INSERT INTO roles_permisos (rol_id, permiso_id) SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo IN ('clientes.ver', 'clientes.gestionar') WHERE r.nombre IN ('administrador', 'supervisor');
INSERT INTO roles_permisos (rol_id, permiso_id) SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo = 'clientes.ver' WHERE r.nombre = 'cajero';
