# Base de datos

La aplicación usa MariaDB de XAMPP y administra el esquema mediante migraciones SQL versionadas.

## Aplicar migraciones

Con MariaDB iniciado y `backend/.env` configurado:

```bash
npm run db:migrar
```

El ejecutor crea la tabla `migraciones`, aplica los archivos pendientes en orden y registra cada archivo ejecutado. Volver a ejecutar el comando no repite migraciones ya aplicadas.

## Convenciones

- tablas y campos en español, `snake_case` y sin tildes;
- tablas de negocio en plural;
- claves primarias llamadas `id`;
- claves foráneas con sufijo `_id`;
- fechas con precisión de milisegundos;
- borrado restringido para información sensible;
- relaciones auxiliares eliminadas en cascada solo cuando no representan un hecho histórico.
