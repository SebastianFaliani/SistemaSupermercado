export function requerirPermiso(codigo) {
  return (solicitud, respuesta, siguiente) => {
    if (!solicitud.usuario?.permisos.includes(codigo)) {
      return respuesta.status(403).json({ mensaje: 'No tenés permiso para esta operación' });
    }
    siguiente();
  };
}
