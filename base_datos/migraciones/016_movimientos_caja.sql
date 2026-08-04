CREATE TABLE movimientos_caja (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sesion_caja_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_movimientos_caja_sesion_fecha (sesion_caja_id, fecha_creacion),
  CONSTRAINT fk_movimientos_caja_sesion FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja (id),
  CONSTRAINT fk_movimientos_caja_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT chk_movimientos_caja_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
