ALTER TABLE promociones_ecommerce
  ADD COLUMN aplica_supermercado BOOLEAN NOT NULL DEFAULT FALSE AFTER es_destacada;

ALTER TABLE ventas_detalles
  ADD COLUMN descuento DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER costo_unitario;
