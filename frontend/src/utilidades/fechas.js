const partesFecha = (valor) => {
  const coincidencia = String(valor ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return coincidencia ? { anio: coincidencia[1], mes: coincidencia[2], dia: coincidencia[3] } : null;
};

export const formatearFecha = (valor, alternativa = '—') => {
  const partes = partesFecha(valor);
  return partes ? `${partes.dia}-${partes.mes}-${partes.anio}` : alternativa;
};

export const formatearFechaHora = (valor, alternativa = '—') => {
  if (!valor) return alternativa;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return alternativa;
  const fechaFormateada = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(fecha);
  return fechaFormateada.replace(',', '').replaceAll('/', '-');
};

export const formatearHora = (valor, alternativa = '—') => {
  if (!valor) return alternativa;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return alternativa;
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(fecha);
};

export const fechaParaInput = (fecha = new Date()) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

export const fechaCivilVencida = (valor) => {
  const partes = partesFecha(valor);
  if (!partes) return false;
  return `${partes.anio}-${partes.mes}-${partes.dia}` < fechaParaInput();
};
