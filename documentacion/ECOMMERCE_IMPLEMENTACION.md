# Canal de venta online — La 91

## Alcance implementado

El canal online usa la misma base de clientes, productos, precios de venta, existencias y Tesorería del sistema local. Mantiene entidades separadas para publicación, promociones, direcciones, pedidos, reservas, pagos, reembolsos e historial de estados.

- La cantidad visible es `existencia física - reservada - stock de seguridad online`.
- Crear un pedido reserva stock; todavía no lo descuenta.
- Cancelar o vencer el pedido libera la reserva.
- Entregar el pedido genera una venta de canal `ecommerce`, descuenta stock y conserva la trazabilidad con el pedido.
- Los cobros ingresan en la cuenta de Tesorería elegida. Las comisiones se separan del importe neto.
- Los reembolsos generan un egreso de Tesorería y actualizan el estado del pago.
- Las sustituciones trasladan la reserva al producto elegido y recalculan el total. Si ya se cobró de más, queda un reembolso pendiente antes de entregar.

## Accesos

- Gestión interna: módulo **E-commerce** dentro del sistema.
- Tienda pública: `/tienda`.
- Administrador y supervisor configuran el canal, promociones, pagos y pedidos.
- Depósito consulta y prepara pedidos, pero no administra cobros ni configuración.

## Puesta en marcha

1. Ejecutar migraciones con `npm run db:migrar`.
2. Opcionalmente preparar un surtido de prueba con `npm run ecommerce:preparar-catalogo`.
3. En **E-commerce > Configuración**, definir origen, distancia máxima, pedido mínimo, costos, medios admitidos y mensaje de portada.
4. Revisar las publicaciones y el stock de seguridad antes de abrir la tienda.
5. Crear promociones y finalmente marcar **Tienda habilitada**.

## Pagos

Efectivo y transferencia funcionan mediante confirmación interna y selección explícita de cuenta de Tesorería. Mercado Pago queda deshabilitado por defecto: para habilitar cobro automático en producción se necesitan las credenciales de la cuenta comercial, URL pública HTTPS y secreto de webhook. No se deben guardar credenciales reales en el repositorio.

## Verificación automatizada

`npm run ecommerce:probar` ejecuta un circuito completo y reversible: publicación temporal, pedido, reserva, pago, preparación, entrega, venta, stock y Tesorería. Al finalizar restaura el producto y elimina exclusivamente los registros de esa prueba.
