import { aplicacion } from './aplicacion.js';
import { entorno } from './configuracion/entorno.js';

const servidor = aplicacion.listen(entorno.puerto, () => {
  console.log(`API disponible en http://localhost:${entorno.puerto}`);
});

function cerrarServidor(senal) {
  console.log(`Cerrando servidor (${senal})...`);
  servidor.close(() => process.exit(0));
}

process.on('SIGINT', () => cerrarServidor('SIGINT'));
process.on('SIGTERM', () => cerrarServidor('SIGTERM'));
