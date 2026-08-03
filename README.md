# Sistema de Supermercado

Sistema integral para la operación local de un supermercado, preparado para crecer hacia una aplicación móvil con Capacitor y un e-commerce.

## Requisitos

- Node.js 24 o posterior
- npm 11 o posterior
- XAMPP con MariaDB en ejecución
- Git Bash para los comandos de terminal

## Primer inicio

```bash
cp backend/.env.example backend/.env
npm install
npm run dev
```

La interfaz queda disponible en `http://localhost:5173` y la API en `http://localhost:3000`.

## Comandos

```bash
npm run dev
npm run build
npm test
npm run lint
npm run format
npm run db:migrar
```

## Estructura

- `backend/`: API Express y acceso a MariaDB.
- `frontend/`: aplicación React con Vite.
- `compartido/`: contratos y utilidades reutilizables.
- `base_datos/`: migraciones y datos iniciales.
- `storage/`: archivos locales fuera de la base de datos.
- `docs/`: decisiones y documentación funcional.

Más información en [Base de datos](docs/base-datos.md).
