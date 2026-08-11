INSERT INTO permisos (codigo, modulo, nombre, descripcion)
VALUES (
  'ventas.devolver',
  'ventas',
  'Gestionar cambios y devoluciones',
  'Registrar cambios y devoluciones sin autorizar la anulación completa de una venta'
)
ON DUPLICATE KEY UPDATE
  modulo = VALUES(modulo),
  nombre = VALUES(nombre),
  descripcion = VALUES(descripcion);

INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT roles.id, permisos.id
FROM roles
JOIN permisos ON permisos.codigo = 'ventas.devolver'
WHERE roles.nombre IN ('administrador', 'supervisor', 'cajero');
