import { useCallback, useEffect, useState } from 'react';

async function solicitar(ruta, token, opciones = {}) {
  const respuesta = await fetch(ruta, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
      ...opciones.headers,
    },
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo completar la operación');
  return datos;
}

export function Catalogo({ token, permisos }) {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const puedeGestionar = permisos.includes('productos.gestionar');

  const cargar = useCallback(async () => {
    try {
      const [respuestaCategorias, respuestaProductos] = await Promise.all([
        solicitar('/api/catalogo/categorias', token),
        solicitar('/api/catalogo/productos?limite=25', token),
      ]);
      setCategorias(respuestaCategorias.datos);
      setProductos(respuestaProductos.datos);
    } catch (error) {
      setMensaje(error.message);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  async function crearCategoria(evento) {
    evento.preventDefault();
    setMensaje('');
    const formulario = new FormData(evento.currentTarget);
    try {
      await solicitar('/api/catalogo/categorias', token, {
        method: 'POST',
        body: JSON.stringify({ nombre: formulario.get('nombre') }),
      });
      evento.currentTarget.reset();
      setMensaje('Categoría creada correctamente.');
      await cargar();
    } catch (error) {
      setMensaje(error.message);
    }
  }

  return (
    <section className="modulo">
      <div className="modulo__encabezado">
        <div>
          <p className="etiqueta">CATÁLOGO</p>
          <h2>Productos y categorías</h2>
        </div>
        <span className="contador">{productos.length} productos</span>
      </div>

      {puedeGestionar && (
        <form className="formulario-en-linea" onSubmit={crearCategoria}>
          <div>
            <label htmlFor="categoria_nombre">Nueva categoría</label>
            <input id="categoria_nombre" name="nombre" minLength="2" maxLength="100" required placeholder="Ej.: Almacén" />
          </div>
          <button className="boton">Agregar categoría</button>
        </form>
      )}
      {mensaje && <p className="mensaje" role="status">{mensaje}</p>}

      <div className="rejilla-catalogo">
        <article className="panel">
          <h3>Categorías</h3>
          {categorias.length ? (
            <ul className="lista-simple">
              {categorias.map((categoria) => <li key={categoria.id}>{categoria.nombre}</li>)}
            </ul>
          ) : <p className="vacio">Todavía no hay categorías.</p>}
        </article>
        <article className="panel panel--productos">
          <h3>Productos recientes</h3>
          {productos.length ? (
            <div className="tabla-contenedor">
              <table>
                <thead><tr><th>Producto</th><th>Código</th><th>Categoría</th><th>Precio</th></tr></thead>
                <tbody>{productos.map((producto) => (
                  <tr key={producto.id}>
                    <td>{producto.nombre}</td><td>{producto.codigo_barra}</td>
                    <td>{producto.categoria}</td><td>${producto.precio_venta}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="vacio">El catálogo está listo para recibir el primer producto.</p>}
        </article>
      </div>
    </section>
  );
}
