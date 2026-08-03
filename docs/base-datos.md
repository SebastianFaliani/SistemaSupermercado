# Base de datos

La aplicación usa MariaDB de XAMPP y administra el esquema mediante migraciones SQL versionadas.

## Aplicar migraciones

Con MariaDB iniciado y `backend/.env` configurado:

```bash
npm run db:migrar
```

El ejecutor crea la tabla `migraciones`, aplica los archivos pendientes en orden y registra cada archivo ejecutado. Volver a ejecutar el comando no repite migraciones ya aplicadas.

## Importar el catálogo inicial

La vista previa no modifica datos:

```bash
npm run catalogo:importar
```

Después de revisar el resumen, la importación se ejecuta con:

```bash
npm run catalogo:importar -- --aplicar
```

El importador considera el precio mayorista de la fuente como costo de compra, calcula el precio de venta con un margen del 30% y lo redondea al múltiplo de $10 más cercano. También registra el precio inicial en el historial y copia las imágenes al almacenamiento local, fuera de Git.

## Convenciones

- tablas y campos en español, `snake_case` y sin tildes;
- tablas de negocio en plural;
- claves primarias llamadas `id`;
- claves foráneas con sufijo `_id`;
- fechas con precisión de milisegundos;
- borrado restringido para información sensible;
- relaciones auxiliares eliminadas en cascada solo cuando no representan un hecho histórico.
