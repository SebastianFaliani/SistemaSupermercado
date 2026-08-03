import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { requerirAutenticacion } from './autenticacion.middleware.js';
import { iniciarSesion } from './autenticacion.servicio.js';

const datosInicioSesion = z.object({
  nombre_usuario: z.string().trim().min(3).max(60),
  clave: z.string().min(8).max(128),
});

export const rutasAutenticacion = Router();

rutasAutenticacion.post(
  '/iniciar-sesion',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8' }),
  async (solicitud, respuesta) => {
    const validacion = datosInicioSesion.safeParse(solicitud.body);
    if (!validacion.success) {
      return respuesta.status(400).json({ mensaje: 'Datos de acceso inválidos' });
    }
    const resultado = await iniciarSesion(
      validacion.data.nombre_usuario,
      validacion.data.clave,
    );
    if (!resultado) {
      return respuesta.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
    }
    respuesta.json(resultado);
  },
);

rutasAutenticacion.get('/perfil', requerirAutenticacion, (solicitud, respuesta) => {
  respuesta.json({ usuario: solicitud.usuario });
});
