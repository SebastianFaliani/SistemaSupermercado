INSERT IGNORE INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo = 'cuentas_clientes.ver'
WHERE r.nombre = 'cajero';
