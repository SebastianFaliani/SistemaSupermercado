import { createElement, useEffect, useState } from 'react';
import { Catalogo } from './Catalogo.jsx';
import { Inventario } from './Inventario.jsx';
import { Usuarios } from './Usuarios.jsx';
import { Proveedores } from './Proveedores.jsx';
import { Compras } from './Compras.jsx';
import { Ventas } from './Ventas.jsx';

const CLAVE_TOKEN = 'supermercado_token';

export function Aplicacion() {
  const [usuario, setUsuario] = useState(null);
  const [estado, setEstado] = useState('comprobando');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [moduloActivo, setModuloActivo] = useState('catalogo');

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
      <div className="aplicacion-interna">
        <header className="barra-superior">
          <div className="marca-encabezado"><img src="/marca/favicon-circular.png" alt="" /><strong>LA 91</strong><span>Gestión local</span></div>
          <div className="usuario-actual">
            <span>{usuario.nombre_usuario}</span>
            <button type="button" onClick={salir}>Cerrar sesión</button>
          </div>
        </header>
        <nav className="navegacion-principal" aria-label="Módulos principales">
          <button className={moduloActivo === 'catalogo' ? 'activo' : ''} onClick={() => setModuloActivo('catalogo')}>Catálogo</button>
          <button className={moduloActivo === 'inventario' ? 'activo' : ''} onClick={() => setModuloActivo('inventario')}>Inventario</button>
          {usuario.permisos.includes('usuarios.ver') && <button className={moduloActivo === 'usuarios' ? 'activo' : ''} onClick={() => setModuloActivo('usuarios')}>Usuarios</button>}
          {usuario.permisos.includes('compras.ver') && <button className={moduloActivo === 'proveedores' ? 'activo' : ''} onClick={() => setModuloActivo('proveedores')}>Proveedores</button>}
          {usuario.permisos.includes('compras.ver') && <button className={moduloActivo === 'compras' ? 'activo' : ''} onClick={() => setModuloActivo('compras')}>Compras</button>}
          {usuario.permisos.includes('ventas.crear') && <button className={moduloActivo === 'ventas' ? 'activo' : ''} onClick={() => setModuloActivo('ventas')}>Punto de venta</button>}
        </nav>
        <main className="contenido-interno">
          {moduloActivo === 'catalogo' && createElement(Catalogo, {
            token: sessionStorage.getItem(CLAVE_TOKEN), permisos: usuario.permisos,
          })}
          {moduloActivo === 'inventario' && createElement(Inventario, {
            token: sessionStorage.getItem(CLAVE_TOKEN), permisos: usuario.permisos,
          })}
          {moduloActivo === 'usuarios' && createElement(Usuarios, {
            token: sessionStorage.getItem(CLAVE_TOKEN), permisos: usuario.permisos,
          })}
          {moduloActivo === 'proveedores' && createElement(Proveedores, {
            token: sessionStorage.getItem(CLAVE_TOKEN), permisos: usuario.permisos,
          })}
          {moduloActivo === 'compras' && createElement(Compras, { token: sessionStorage.getItem(CLAVE_TOKEN), permisos: usuario.permisos })}
          {moduloActivo === 'ventas' && createElement(Ventas, { token: sessionStorage.getItem(CLAVE_TOKEN) })}
        </main>
      </div>
    );
  }

  return (
    <main className="contenedor">
      <section className="tarjeta tarjeta--acceso">
        <img className="logo-acceso" src="/marca/logo-horizontal-claro.png" alt="La 91 Supermercado" />
        <p className="etiqueta">ACCESO AL SISTEMA</p>
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
