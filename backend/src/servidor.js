import { aplicacion } from './aplicacion.js';
import { entorno } from './configuracion/entorno.js';
import { expirarReservas } from './modulos/ecommerce/ecommerce.servicio.js';

const servidor = aplicacion.listen(entorno.puerto, () => {
  console.log(`API disponible en http://localhost:${entorno.puerto}`);
});

const relojReservas = setInterval(() => expirarReservas().catch((error) => console.error('No se pudieron vencer reservas online', error)), 60_000);
relojReservas.unref();

function cerrarServidor(senal) {
  console.log(`Cerrando servidor (${senal})...`);
  servidor.close(() => process.exit(0));
}

process.on('SIGINT', () => cerrarServidor('SIGINT'));
process.on('SIGTERM', () => cerrarServidor('SIGTERM'));
