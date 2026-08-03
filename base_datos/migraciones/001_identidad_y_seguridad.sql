CREATE TABLE empleados (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero_documento VARCHAR(20) NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  correo_electronico VARCHAR(254) NULL,
  telefono VARCHAR(30) NULL,
  direccion VARCHAR(255) NULL,
  fecha_ingreso DATE NOT NULL,
  fecha_egreso DATE NULL,
  esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_empleados_numero_documento (numero_documento),
  UNIQUE KEY uq_empleados_correo_electronico (correo_electronico),
  CONSTRAINT chk_empleados_fechas
    CHECK (fecha_egreso IS NULL OR fecha_egreso >= fecha_ingreso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  empleado_id BIGINT UNSIGNED NULL,
  nombre_usuario VARCHAR(60) NOT NULL,
  clave_hash VARCHAR(255) NOT NULL,
  esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
  requiere_cambio_clave BOOLEAN NOT NULL DEFAULT TRUE,
  intentos_fallidos SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  fecha_bloqueo DATETIME(3) NULL,
  fecha_ultimo_acceso DATETIME(3) NULL,
  fecha_cambio_clave DATETIME(3) NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_empleado_id (empleado_id),
  UNIQUE KEY uq_usuarios_nombre_usuario (nombre_usuario),
  CONSTRAINT fk_usuarios_empleado
    FOREIGN KEY (empleado_id) REFERENCES empleados (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(255) NULL,
  es_sistema BOOLEAN NOT NULL DEFAULT FALSE,
  esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permisos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(120) NOT NULL,
  modulo VARCHAR(60) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_permisos_codigo (codigo),
  KEY idx_permisos_modulo (modulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios_roles (
  usuario_id BIGINT UNSIGNED NOT NULL,
  rol_id BIGINT UNSIGNED NOT NULL,
  asignado_por_usuario_id BIGINT UNSIGNED NULL,
  fecha_asignacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (usuario_id, rol_id),
  KEY idx_usuarios_roles_rol_id (rol_id),
  KEY idx_usuarios_roles_asignado_por (asignado_por_usuario_id),
  CONSTRAINT fk_usuarios_roles_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_usuarios_roles_rol
    FOREIGN KEY (rol_id) REFERENCES roles (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_usuarios_roles_asignado_por
    FOREIGN KEY (asignado_por_usuario_id) REFERENCES usuarios (id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles_permisos (
  rol_id BIGINT UNSIGNED NOT NULL,
  permiso_id BIGINT UNSIGNED NOT NULL,
  fecha_asignacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (rol_id, permiso_id),
  KEY idx_roles_permisos_permiso_id (permiso_id),
  CONSTRAINT fk_roles_permisos_rol
    FOREIGN KEY (rol_id) REFERENCES roles (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_roles_permisos_permiso
    FOREIGN KEY (permiso_id) REFERENCES permisos (id)
    ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auditorias (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NULL,
  accion VARCHAR(100) NOT NULL,
  entidad VARCHAR(100) NOT NULL,
  entidad_id VARCHAR(100) NULL,
  datos_anteriores JSON NULL,
  datos_nuevos JSON NULL,
  direccion_ip VARCHAR(45) NULL,
  agente_usuario VARCHAR(500) NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_auditorias_usuario_fecha (usuario_id, fecha_creacion),
  KEY idx_auditorias_entidad (entidad, entidad_id),
  KEY idx_auditorias_fecha_creacion (fecha_creacion),
  CONSTRAINT fk_auditorias_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
