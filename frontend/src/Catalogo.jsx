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
  const [totalProductos, setTotalProductos] = useState(0);
  const [referencias, setReferencias] = useState({ marcas: [], unidades_medida: [] });
  const [mensaje, setMensaje] = useState('');
  const [mostrarProducto, setMostrarProducto] = useState(false);
  const puedeGestionar = permisos.includes('productos.gestionar');

  const cargar = useCallback(async () => {
    try {
      const [respuestaCategorias, respuestaProductos, respuestaReferencias] = await Promise.all([
        solicitar('/api/catalogo/categorias', token),
        solicitar('/api/catalogo/productos?limite=25', token),
        solicitar('/api/catalogo/referencias', token),
      ]);
      setCategorias(respuestaCategorias.datos);
      setProductos(respuestaProductos.datos);
      setTotalProductos(respuestaProductos.total);
      setReferencias(respuestaReferencias);
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

  async function crearProducto(evento) {
    evento.preventDefault();
    setMensaje('');
    const formulario = new FormData(evento.currentTarget);
    const opcionalNumero = (nombre) => {
      const valor = formulario.get(nombre);
      return valor === '' ? null : Number(valor);
    };
    try {
      await solicitar('/api/catalogo/productos', token, {
        method: 'POST',
        body: JSON.stringify({
          nombre: formulario.get('nombre'),
          codigo_interno: formulario.get('codigo_interno') || null,
          codigos_barra: formulario.get('codigos_barra').split(',').map((codigo) => codigo.trim()).filter(Boolean),
          categoria_id: Number(formulario.get('categoria_id')),
          marca_id: opcionalNumero('marca_id'),
          unidad_medida_id: Number(formulario.get('unidad_medida_id')),
          contenido_neto: opcionalNumero('contenido_neto'),
          precio_costo: Number(formulario.get('precio_costo')),
          precio_venta: Number(formulario.get('precio_venta')),
          precio_mayorista: opcionalNumero('precio_mayorista'),
          cantidad_minima_mayorista: opcionalNumero('cantidad_minima_mayorista'),
          stock_minimo: Number(formulario.get('stock_minimo') || 0),
          es_pesable: formulario.get('es_pesable') === 'on',
          descripcion: formulario.get('descripcion') || null,
          imagen_url: formulario.get('imagen_url') || null,
        }),
      });
      evento.currentTarget.reset();
      setMostrarProducto(false);
      setMensaje('Producto creado correctamente.');
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
        <div className="acciones-encabezado">
          <span className="contador">{totalProductos} productos</span>
          {puedeGestionar && <button className="boton" onClick={() => setMostrarProducto((valor) => !valor)}>{mostrarProducto ? 'Cancelar' : 'Nuevo producto'}</button>}
        </div>
      </div>

      {mostrarProducto && (
        <form className="formulario-producto" onSubmit={crearProducto}>
          <h3>Nuevo producto</h3>
          <div className="campos-producto">
            <div className="campo campo--ancho"><label htmlFor="producto_nombre">Nombre</label><input id="producto_nombre" name="nombre" minLength="2" maxLength="180" required /></div>
            <div className="campo"><label htmlFor="producto_codigo_barra">Código de barras</label><input id="producto_codigo_barra" name="codigos_barra" minLength="4" required placeholder="Separar varios con comas" /></div>
            <div className="campo"><label htmlFor="producto_codigo_interno">Código interno</label><input id="producto_codigo_interno" name="codigo_interno" /></div>
            <div className="campo"><label htmlFor="producto_categoria">Categoría</label><select id="producto_categoria" name="categoria_id" required defaultValue=""><option value="" disabled>Seleccionar</option>{categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}</select></div>
            <div className="campo"><label htmlFor="producto_marca">Marca</label><select id="producto_marca" name="marca_id" defaultValue=""><option value="">Sin marca</option>{referencias.marcas.map((marca) => <option key={marca.id} value={marca.id}>{marca.nombre}</option>)}</select></div>
            <div className="campo"><label htmlFor="producto_unidad">Unidad de medida</label><select id="producto_unidad" name="unidad_medida_id" required defaultValue=""><option value="" disabled>Seleccionar</option>{referencias.unidades_medida.map((unidad) => <option key={unidad.id} value={unidad.id}>{unidad.nombre} ({unidad.abreviatura})</option>)}</select></div>
            <div className="campo"><label htmlFor="producto_contenido">Contenido neto</label><input id="producto_contenido" name="contenido_neto" type="number" min="0.001" step="0.001" /></div>
            <div className="campo"><label htmlFor="producto_costo">Precio de costo</label><input id="producto_costo" name="precio_costo" type="number" min="0" step="0.01" required /></div>
            <div className="campo"><label htmlFor="producto_venta">Precio de venta</label><input id="producto_venta" name="precio_venta" type="number" min="0" step="0.01" required /></div>
            <div className="campo"><label htmlFor="producto_mayorista">Precio mayorista</label><input id="producto_mayorista" name="precio_mayorista" type="number" min="0" step="0.01" /></div>
            <div className="campo"><label htmlFor="producto_cantidad_mayorista">Cantidad mínima mayorista</label><input id="producto_cantidad_mayorista" name="cantidad_minima_mayorista" type="number" min="0.001" step="0.001" /></div>
            <div className="campo"><label htmlFor="producto_stock_minimo">Stock mínimo</label><input id="producto_stock_minimo" name="stock_minimo" type="number" min="0" step="0.001" defaultValue="0" /></div>
            <div className="campo campo--ancho"><label htmlFor="producto_imagen">URL de imagen</label><input id="producto_imagen" name="imagen_url" maxLength="500" /></div>
            <div className="campo campo--ancho"><label htmlFor="producto_descripcion">Descripción</label><textarea id="producto_descripcion" name="descripcion" rows="3" /></div>
            <label className="campo-verificacion"><input name="es_pesable" type="checkbox" /> Producto pesable</label>
          </div>
          <button className="boton">Guardar producto</button>
        </form>
      )}

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
                    <td>{producto.categoria}</td><td>${Number(producto.precio_venta).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
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
