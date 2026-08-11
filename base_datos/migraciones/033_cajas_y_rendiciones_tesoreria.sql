ALTER TABLE sesiones_caja
  ADD COLUMN cuenta_origen_apertura_id BIGINT UNSIGNED NULL AFTER monto_inicial,
  ADD COLUMN estado_rendicion VARCHAR(20) NOT NULL DEFAULT 'pendiente' AFTER diferencia_cierre,
  ADD COLUMN cuenta_destino_rendicion_id BIGINT UNSIGNED NULL AFTER estado_rendicion,
  ADD COLUMN monto_rendido DECIMAL(15,2) NULL AFTER cuenta_destino_rendicion_id,
  ADD COLUMN fecha_rendicion DATETIME(3) NULL AFTER monto_rendido,
  ADD CONSTRAINT fk_sesion_caja_origen FOREIGN KEY (cuenta_origen_apertura_id) REFERENCES cuentas_tesoreria (id),
  ADD CONSTRAINT fk_sesion_caja_destino FOREIGN KEY (cuenta_destino_rendicion_id) REFERENCES cuentas_tesoreria (id);

ALTER TABLE movimientos_tesoreria
  ADD COLUMN sesion_caja_apertura_id BIGINT UNSIGNED NULL,
  ADD COLUMN sesion_caja_rendicion_id BIGINT UNSIGNED NULL,
  ADD UNIQUE KEY uq_movimiento_apertura_caja (sesion_caja_apertura_id),
  ADD UNIQUE KEY uq_movimiento_rendicion_caja (sesion_caja_rendicion_id),
  ADD CONSTRAINT fk_movimiento_apertura_caja FOREIGN KEY (sesion_caja_apertura_id) REFERENCES sesiones_caja (id),
  ADD CONSTRAINT fk_movimiento_rendicion_caja FOREIGN KEY (sesion_caja_rendicion_id) REFERENCES sesiones_caja (id);
