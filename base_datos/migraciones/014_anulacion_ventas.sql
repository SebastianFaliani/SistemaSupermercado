ALTER TABLE ventas
  ADD COLUMN anulada_por_usuario_id BIGINT UNSIGNED NULL AFTER usuario_id,
  ADD COLUMN motivo_anulacion VARCHAR(255) NULL AFTER estado,
  ADD COLUMN fecha_anulacion DATETIME(3) NULL AFTER fecha_creacion,
  ADD CONSTRAINT fk_ventas_anulada_por FOREIGN KEY (anulada_por_usuario_id)
    REFERENCES usuarios (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
