ALTER TABLE devoluciones_ventas ADD COLUMN credito_cuenta DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER diferencia;
