ALTER TABLE ventas_detalles ADD COLUMN costo_unitario DECIMAL(15,2) NULL AFTER precio_unitario;
UPDATE ventas_detalles vd JOIN productos p ON p.id = vd.producto_id SET vd.costo_unitario = p.precio_costo WHERE vd.costo_unitario IS NULL;
ALTER TABLE ventas_detalles MODIFY costo_unitario DECIMAL(15,2) NOT NULL;
