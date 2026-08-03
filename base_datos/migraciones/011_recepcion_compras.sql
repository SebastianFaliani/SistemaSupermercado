ALTER TABLE ordenes_compra
  ADD COLUMN modalidad_entrega VARCHAR(30) NOT NULL DEFAULT 'entrega_proveedor' AFTER estado,
  ADD COLUMN responsable_retiro VARCHAR(120) NULL AFTER modalidad_entrega,
  ADD COLUMN numero_comprobante VARCHAR(80) NULL AFTER responsable_retiro,
  ADD COLUMN recibido_por_usuario_id BIGINT UNSIGNED NULL AFTER usuario_id,
  ADD COLUMN fecha_recepcion DATETIME(3) NULL AFTER fecha_esperada,
  ADD CONSTRAINT fk_ordenes_compra_recibido_por FOREIGN KEY (recibido_por_usuario_id)
    REFERENCES usuarios (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
