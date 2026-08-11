ALTER TABLE facturas_proveedores
  ADD UNIQUE KEY uq_factura_orden_compra (orden_compra_id);
