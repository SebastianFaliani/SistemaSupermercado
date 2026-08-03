import { useEffect, useState } from 'react';

const CLAVE_TOKEN = 'supermercado_token';

export function Aplicacion() {
  const [usuario, setUsuario] = useState(null);
  const [estado, setEstado] = useState('comprobando');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem(CLAVE_TOKEN);
    if (!token) {
      setEstado('sin_sesion');
      return;
    }
    fetch('/api/autenticacion/perfil', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error();
        return respuesta.json();
      })
      .then(({ usuario: perfil }) => {
        setUsuario(perfil);
        setEstado('autenticado');
      })
      .catch(() => {
        sessionStorage.removeItem(CLAVE_TOKEN);
        setEstado('sin_sesion');
      });
  }, []);

  async function ingresar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje('');
    const formulario = new FormData(evento.currentTarget);

    try {
      const respuesta = await fetch('/api/autenticacion/iniciar-sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_usuario: formulario.get('nombre_usuario'),
          clave: formulario.get('clave'),
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje);
      sessionStorage.setItem(CLAVE_TOKEN, datos.token);
      setUsuario(datos.usuario);
      setEstado('autenticado');
    } catch (error) {
      setMensaje(error.message || 'No fue posible iniciar sesión');
    } finally {
      setEnviando(false);
    }
  }

  function salir() {
    sessionStorage.removeItem(CLAVE_TOKEN);
    setUsuario(null);
    setEstado('sin_sesion');
  }

  if (estado === 'comprobando') {
    return <main className="contenedor"><p>Comprobando sesión…</p></main>;
  }

  if (estado === 'autenticado') {
    return (
      <main className="contenedor">
        <section className="tarjeta">
          <p className="etiqueta">SESIÓN INICIADA</p>
          <h1>Hola, {usuario.nombre_usuario}</h1>
          <p>Roles asignados: {usuario.roles.join(', ') || 'ninguno'}.</p>
          <button type="button" className="boton boton--secundario" onClick={salir}>
            Cerrar sesión
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="contenedor">
      <section className="tarjeta tarjeta--acceso">
        <p className="etiqueta">ACCESO AL SISTEMA</p>
        <h1>Supermercado</h1>
        <p>Ingresá con tu usuario para comenzar.</p>
        <form onSubmit={ingresar}>
          <label htmlFor="nombre_usuario">Usuario</label>
          <input id="nombre_usuario" name="nombre_usuario" minLength="3" required autoComplete="username" />
          <label htmlFor="clave">Contraseña</label>
          <input id="clave" name="clave" type="password" minLength="8" required autoComplete="current-password" />
          {mensaje && <p className="mensaje-error" role="alert">{mensaje}</p>}
          <button className="boton" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  );
}
