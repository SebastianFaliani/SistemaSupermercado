import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

const rutaEntorno = fileURLToPath(new URL('../../.env', import.meta.url));
config({ path: rutaEntorno });

export const entorno = {
  puerto: Number(process.env.PUERTO ?? 3000),
  origenFrontend: process.env.ORIGEN_FRONTEND ?? 'http://localhost:5173',
  baseDatos: {
    host: process.env.BD_HOST ?? '127.0.0.1',
    puerto: Number(process.env.BD_PUERTO ?? 3306),
    nombre: process.env.BD_NOMBRE ?? 'supermercado',
    usuario: process.env.BD_USUARIO ?? 'supermercado_app',
    clave: process.env.BD_CLAVE ?? '',
  },
  jwt: {
    secreto: process.env.JWT_SECRETO ?? '',
    duracion: process.env.JWT_DURACION ?? '8h',
  },
};
