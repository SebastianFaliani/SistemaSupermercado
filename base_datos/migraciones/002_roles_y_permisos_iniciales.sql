INSERT INTO roles (nombre, descripcion, es_sistema) VALUES
  ('administrador', 'Acceso completo a la configuración y operación', TRUE),
  ('supervisor', 'Supervisión del local y autorización de operaciones sensibles', TRUE),
  ('cajero', 'Operación de ventas y caja asignada', TRUE),
  ('deposito', 'Recepción de mercadería y control de inventario', TRUE);

INSERT INTO permisos (codigo, modulo, nombre, descripcion) VALUES
  ('usuarios.ver', 'seguridad', 'Ver usuarios', 'Consultar usuarios y empleados'),
  ('usuarios.gestionar', 'seguridad', 'Gestionar usuarios', 'Crear, modificar y bloquear usuarios'),
  ('roles.gestionar', 'seguridad', 'Gestionar roles', 'Asignar roles y permisos'),
  ('auditorias.ver', 'seguridad', 'Ver auditorías', 'Consultar el registro de acciones sensibles'),
  ('productos.ver', 'catalogo', 'Ver productos', 'Consultar productos, precios y códigos'),
  ('productos.gestionar', 'catalogo', 'Gestionar productos', 'Crear y modificar productos'),
  ('precios.gestionar', 'catalogo', 'Gestionar precios', 'Modificar costos, precios y listas'),
  ('stock.ver', 'inventario', 'Ver stock', 'Consultar existencias y movimientos'),
  ('stock.mover', 'inventario', 'Registrar movimientos', 'Registrar entradas, salidas y transferencias'),
  ('stock.ajustar', 'inventario', 'Ajustar stock', 'Autorizar ajustes de inventario'),
  ('compras.ver', 'compras', 'Ver compras', 'Consultar órdenes y recepciones'),
  ('compras.gestionar', 'compras', 'Gestionar compras', 'Crear órdenes y recibir mercadería'),
  ('ventas.crear', 'ventas', 'Crear ventas', 'Operar el punto de venta'),
  ('ventas.anular', 'ventas', 'Anular ventas', 'Autorizar anulaciones y devoluciones'),
  ('caja.abrir', 'caja', 'Abrir caja', 'Iniciar una sesión de caja'),
  ('caja.operar', 'caja', 'Operar caja', 'Registrar cobros, ingresos y egresos permitidos'),
  ('caja.cerrar', 'caja', 'Cerrar caja', 'Declarar y cerrar una sesión de caja'),
  ('caja.supervisar', 'caja', 'Supervisar cajas', 'Revisar cierres y diferencias'),
  ('reportes.ver', 'reportes', 'Ver reportes', 'Consultar reportes operativos y financieros');

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT roles.id, permisos.id
FROM roles
CROSS JOIN permisos
WHERE roles.nombre = 'administrador';

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT roles.id, permisos.id
FROM roles
JOIN permisos ON permisos.codigo IN (
  'usuarios.ver', 'auditorias.ver', 'productos.ver', 'productos.gestionar',
  'precios.gestionar', 'stock.ver', 'stock.mover', 'stock.ajustar',
  'compras.ver', 'compras.gestionar', 'ventas.crear', 'ventas.anular',
  'caja.abrir', 'caja.operar', 'caja.cerrar', 'caja.supervisar', 'reportes.ver'
)
WHERE roles.nombre = 'supervisor';

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT roles.id, permisos.id
FROM roles
JOIN permisos ON permisos.codigo IN (
  'productos.ver', 'stock.ver', 'ventas.crear',
  'caja.abrir', 'caja.operar', 'caja.cerrar'
)
WHERE roles.nombre = 'cajero';

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT roles.id, permisos.id
FROM roles
JOIN permisos ON permisos.codigo IN (
  'productos.ver', 'stock.ver', 'stock.mover', 'compras.ver', 'compras.gestionar'
)
WHERE roles.nombre = 'deposito';
