import { useEffect, useState } from 'react';

export function Aplicacion() {
  const [estado, setEstado] = useState('comprobando');

  useEffect(() => {
    fetch('/api/salud')
      .then((respuesta) => respuesta.json())
      .then((datos) => setEstado(datos.base_datos))
      .catch(() => setEstado('sin_conexion'));
  }, []);

  return (
    <main className="contenedor">
      <section className="tarjeta">
        <p className="etiqueta">ETAPA INICIAL</p>
        <h1>Sistema de Supermercado</h1>
        <p>La aplicación local está preparada para comenzar el desarrollo.</p>
        <div className={`estado estado--${estado}`}>
          <span aria-hidden="true" />
          Base de datos: {estado.replace('_', ' ')}
        </div>
      </section>
    </main>
  );
}
