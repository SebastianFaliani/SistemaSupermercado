# Autenticación

Las contraseñas se almacenan con bcrypt y nunca en texto plano. El inicio de sesión entrega un token con duración configurable; el frontend lo conserva únicamente durante la sesión de la pestaña.

Después de cinco contraseñas incorrectas, el usuario queda bloqueado durante 15 minutos. La ruta de acceso también limita solicitudes por dirección IP.

## Crear el primer administrador

En Git Bash, la contraseña se solicita sin mostrarla y se pasa al proceso mediante una variable temporal:

```bash
read -s -p "Contraseña inicial: " ADMIN_CLAVE
echo
export ADMIN_CLAVE
npm run admin:crear -- --usuario administrador --nombres Sebastian --apellidos Faliani --correo nedase@gmail.com
unset ADMIN_CLAVE
```

La contraseña debe tener al menos 12 caracteres. El comando crea conjuntamente el empleado, usuario y asignación del rol `administrador`.

## API

- `POST /api/autenticacion/iniciar-sesion`
- `GET /api/autenticacion/perfil`, usando `Authorization: Bearer <token>`
