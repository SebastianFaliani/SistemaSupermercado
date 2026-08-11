# Respaldo y recuperación de la base de datos

Los respaldos se guardan en `base_datos/respaldos/`. Esa carpeta está excluida de Git porque puede contener información privada del comercio.

## Crear un respaldo

Desde la raíz del proyecto:

```bash
npm run db:respaldar
```

El comando genera un archivo SQL fechado, comprueba que no esté vacío e informa su ubicación y tamaño. La aplicación puede permanecer detenida o en uso; el volcado se realiza como una transacción consistente.

Después de cada respaldo hay que copiar el archivo a otro dispositivo o almacenamiento protegido. Un respaldo guardado únicamente en la misma computadora no protege frente a una falla del disco.

## Probar una restauración

La restauración nunca acepta como destino la base operativa. El nombre de la base de prueba debe terminar obligatoriamente en `_restauracion`.

Un administrador de MariaDB debe crear una base vacía y darle permisos al usuario configurado en `backend/.env`. En la instalación local actual se realizó así desde una consola administrativa de MariaDB:

```sql
CREATE DATABASE supermercado_prueba_restauracion
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON supermercado_prueba_restauracion.*
  TO 'supermercado_app'@'localhost';
FLUSH PRIVILEGES;
```

Luego, desde la raíz del proyecto:

```bash
npm run db:restaurar -- --archivo=base_datos/respaldos/ARCHIVO.sql --destino=supermercado_prueba_restauracion
```

El comando importa el archivo y confirma cuántas tablas fueron recuperadas. Para una prueba completa también se deben comparar cantidades de productos, ventas y movimientos de tesorería con la base original.

## Frecuencia recomendada

- Respaldo automático diario, fuera del horario de mayor actividad.
- Copia adicional antes de instalar una actualización o ejecutar migraciones.
- Conservación sugerida: 7 copias diarias, 4 semanales y 12 mensuales.
- Prueba de restauración mensual en una base separada.
- Acceso a los archivos limitado al administrador responsable.

## Recuperación real

Ante una falla, no se debe importar inmediatamente sobre la única base disponible. Primero se conserva una copia del estado dañado, se restaura el último respaldo en una base separada, se valida su contenido y recién entonces se planifica el reemplazo de la base operativa.
