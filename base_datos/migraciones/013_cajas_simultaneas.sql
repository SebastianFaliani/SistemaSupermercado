INSERT INTO cajas (codigo, nombre) VALUES ('CAJA_2', 'Caja 2');

UPDATE sesiones_caja
SET caja_id = (SELECT id FROM cajas WHERE codigo = 'CAJA_2')
WHERE id = (
  SELECT id_mas_reciente FROM (
    SELECT MAX(sc.id) AS id_mas_reciente
    FROM sesiones_caja sc
    JOIN cajas c ON c.id = sc.caja_id
    WHERE sc.estado = 'abierta' AND c.codigo = 'CAJA_1'
  ) duplicada
)
AND (
  SELECT cantidad FROM (
    SELECT COUNT(*) AS cantidad
    FROM sesiones_caja sc
    JOIN cajas c ON c.id = sc.caja_id
    WHERE sc.estado = 'abierta' AND c.codigo = 'CAJA_1'
  ) conteo
) > 1;

ALTER TABLE sesiones_caja
  ADD COLUMN caja_abierta_id BIGINT UNSIGNED
    GENERATED ALWAYS AS (IF(estado = 'abierta', caja_id, NULL)) STORED,
  ADD COLUMN usuario_abierto_id BIGINT UNSIGNED
    GENERATED ALWAYS AS (IF(estado = 'abierta', usuario_id, NULL)) STORED,
  ADD UNIQUE KEY uq_sesiones_caja_abierta (caja_abierta_id),
  ADD UNIQUE KEY uq_sesiones_usuario_abierto (usuario_abierto_id);
