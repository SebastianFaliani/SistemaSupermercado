ALTER TABLE ordenes_compra_detalles
  ADD COLUMN cantidad_recibida DECIMAL(15,3) NOT NULL DEFAULT 0.000 AFTER cantidad;

UPDATE ordenes_compra_detalles d
JOIN ordenes_compra oc ON oc.id = d.orden_compra_id
SET d.cantidad_recibida = d.cantidad
WHERE oc.estado = 'recibida';
