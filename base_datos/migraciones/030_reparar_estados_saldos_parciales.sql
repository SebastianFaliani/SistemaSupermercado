UPDATE gastos
SET estado = 'parcial'
WHERE estado = 'pagado' AND saldo_pendiente > 0.009;

UPDATE facturas_proveedores
SET estado = 'parcial'
WHERE estado = 'pagada' AND saldo_pendiente > 0.009;
