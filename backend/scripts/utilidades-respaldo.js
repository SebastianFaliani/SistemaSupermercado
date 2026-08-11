import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const candidatos = {
  dump: [
    process.env.MYSQLDUMP_RUTA,
    'C:\\xampp\\mysql\\bin\\mysqldump.exe',
    'mysqldump',
  ],
  cliente: [
    process.env.MYSQL_RUTA,
    'C:\\xampp\\mysql\\bin\\mysql.exe',
    'mysql',
  ],
};

export async function encontrarEjecutable(tipo) {
  for (const candidato of candidatos[tipo].filter(Boolean)) {
    if (!candidato.includes('\\') && !candidato.includes('/')) return candidato;
    try {
      await access(candidato);
      return candidato;
    } catch {
      // Continúa con la siguiente ubicación conocida.
    }
  }
  throw new Error(`No se encontró la utilidad de MySQL requerida: ${tipo}.`);
}

export function argumentosConexion(configuracion) {
  return [
    `--host=${configuracion.host}`,
    `--port=${configuracion.puerto}`,
    `--user=${configuracion.usuario}`,
    '--default-character-set=utf8mb4',
  ];
}

export function ejecutar(executable, args, opciones = {}) {
  return new Promise((resolve, reject) => {
    const { clave = '', ...opcionesProceso } = opciones;
    const proceso = spawn(executable, args, {
      ...opcionesProceso,
      env: { ...process.env, MYSQL_PWD: clave },
      windowsHide: true,
    });
    let error = '';
    proceso.stderr?.on('data', (datos) => {
      error += datos.toString();
    });
    proceso.on('error', reject);
    proceso.on('close', (codigo) => {
      if (codigo === 0) resolve();
      else
        reject(
          new Error(error.trim() || `El proceso terminó con código ${codigo}.`),
        );
    });
  });
}

export function nombreFecha() {
  const ahora = new Date();
  const partes = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(ahora);
  const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
  return `${valor('year')}${valor('month')}${valor('day')}_${valor('hour')}${valor('minute')}${valor('second')}`;
}
