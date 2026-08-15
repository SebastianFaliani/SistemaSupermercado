import { useEffect, useMemo, useState } from 'react';
import { CampoClave } from './componentes/CampoClave.jsx';
import { Modal } from './componentes/Modal.jsx';

const dinero = (n) =>
  Number(n || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
const TOKEN = 'la91_cliente_token';
async function api(ruta, opciones = {}) {
  const respuesta = await fetch(`/api/ecommerce${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.headers || {}),
    },
  });
  const datos = await respuesta.json();
  if (!respuesta.ok)
    throw new Error(datos.mensaje || 'No fue posible completar la operación');
  return datos;
}

export function Tienda() {
  const [portada, setPortada] = useState(null);
  const [productos, setProductos] = useState([]);
  const [total, setTotal] = useState(0);
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [modal, setModal] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [pedido, setPedido] = useState(null);
  const [cotizacion, setCotizacion] = useState(null);
  const [modalidadCheckout, setModalidadCheckout] = useState('retiro');
  const [zonaCheckout, setZonaCheckout] = useState('');
  const [cuponCheckout, setCuponCheckout] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState('');
  const cargar = async () => {
    const filtroCategoria = categoria ? `&categoria_id=${categoria}` : '';
    const [p, listado] = await Promise.all([
      api('/publico/configuracion'),
      api(
        `/publico/productos?buscar=${encodeURIComponent(buscar)}${filtroCategoria}&limite=60`,
      ),
    ]);
    setPortada(p.dato);
    setProductos(listado.datos);
    setTotal(listado.total);
  };
  // La búsqueda se demora para evitar una solicitud por cada tecla.
  useEffect(() => {
    const demora = setTimeout(
      () => cargar().catch((e) => setMensaje(e.message)),
      250,
    );
    return () => clearTimeout(demora);
    // La recarga depende exclusivamente de los filtros visibles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscar, categoria]);
  const importe = useMemo(
    () => carrito.reduce((s, i) => s + Number(i.precio) * i.cantidad, 0),
    [carrito],
  );
  useEffect(() => {
    if (!carrito.length) {
      setCotizacion(null);
      return;
    }
    const demora = setTimeout(
      () =>
        api('/publico/cotizacion', {
          method: 'POST',
          body: JSON.stringify({
            cupon_codigo: cuponAplicado || null,
            items: carrito.map((i) => ({
              producto_id: i.id,
              cantidad: i.cantidad,
            })),
          }),
        })
          .then((r) => setCotizacion(r.dato))
          .catch((e) => setMensaje(e.message)),
      150,
    );
    return () => clearTimeout(demora);
  }, [carrito, cuponAplicado]);
  const agregar = (p) =>
    setCarrito((actual) => {
      const existe = actual.find((i) => i.id === p.id);
      if (existe)
        return actual.map((i) =>
          i.id === p.id
            ? {
                ...i,
                cantidad: Math.min(
                  i.cantidad + 1,
                  Number(p.cantidad_maxima_pedido || p.disponible_online),
                ),
              }
            : i,
        );
      return [...actual, { ...p, cantidad: 1 }];
    });
  const cambiar = (id, cantidad) =>
    setCarrito((a) =>
      a
        .map((i) =>
          i.id === id ? { ...i, cantidad: Math.max(0, Number(cantidad)) } : i,
        )
        .filter((i) => i.cantidad > 0),
    );
  async function finalizar(evento) {
    evento.preventDefault();
    setMensaje('');
    const f = new FormData(evento.currentTarget);
    const envio = f.get('modalidad_entrega') === 'envio';
    try {
      const datos = await api('/publico/pedidos', {
        method: 'POST',
        body: JSON.stringify({
          cliente_token: localStorage.getItem(TOKEN),
          nombre_cliente: f.get('nombre'),
          correo_cliente: f.get('correo'),
          telefono_cliente: f.get('telefono'),
          modalidad_entrega: f.get('modalidad_entrega'),
          medio_pago: f.get('medio_pago'),
          direccion: envio
            ? {
                etiqueta: 'Entrega',
                calle: f.get('calle'),
                numero: f.get('numero'),
                localidad: f.get('localidad'),
                distancia_km: Number(f.get('distancia')),
                zona_entrega_id: Number(f.get('zona')),
                es_principal: false,
              }
            : null,
          acepta_sustituciones: f.get('sustituciones') === 'on',
          observaciones: f.get('observaciones'),
          cupon_codigo: cuponAplicado || null,
          items: carrito.map((i) => ({
            producto_id: i.id,
            cantidad: i.cantidad,
          })),
        }),
      });
      setPedido(datos.dato);
      setCarrito([]);
      setModal('resultado');
    } catch (e) {
      setMensaje(e.message);
    }
  }
  async function acceso(evento, registro) {
    evento.preventDefault();
    const f = new FormData(evento.currentTarget);
    try {
      const d = await api(
        `/publico/clientes/${registro ? 'registro' : 'acceso'}`,
        {
          method: 'POST',
          body: JSON.stringify(
            registro
              ? {
                  nombre: f.get('nombre'),
                  correo: f.get('correo'),
                  telefono: f.get('telefono'),
                  clave: f.get('clave'),
                  acepta_promociones: false,
                }
              : { correo: f.get('correo'), clave: f.get('clave') },
          ),
        },
      );
      localStorage.setItem(TOKEN, d.token);
      setMensaje(`Sesión iniciada como ${d.cliente.nombre}`);
      setModal(null);
    } catch (e) {
      setMensaje(e.message);
    }
  }
  async function consultar(evento) {
    evento.preventDefault();
    const f = new FormData(evento.currentTarget);
    try {
      const d = await api(
        `/publico/pedidos/${encodeURIComponent(f.get('codigo'))}?correo=${encodeURIComponent(f.get('correo'))}`,
      );
      setPedido(d.dato);
      setModal('seguimiento-resultado');
    } catch (e) {
      setMensaje(e.message);
    }
  }
  if (!portada)
    return (
      <main className="tienda">
        <p>Cargando tienda…</p>
      </main>
    );
  const abierta = Boolean(portada.configuracion.esta_activa);
  const totalProductosCheckout = Number(cotizacion?.total_productos ?? importe);
  const zonaSeleccionada = portada.zonas.find(
    (z) => String(z.id) === String(zonaCheckout || portada.zonas[0]?.id),
  );
  const envioGratis =
    Boolean(cotizacion?.envio_gratis_promocion) ||
    (portada.configuracion.envio_gratis_desde &&
      totalProductosCheckout >=
        Number(portada.configuracion.envio_gratis_desde));
  const costoEnvioCheckout =
    modalidadCheckout === 'envio' && !envioGratis
      ? Number(zonaSeleccionada?.costo || 0)
      : 0;
  const totalCheckout = totalProductosCheckout + costoEnvioCheckout;
  return (
    <div className="tienda">
      <header className="tienda__hero">
        <nav className="tienda__hero-nav" aria-label="Acciones de la tienda">
          <button onClick={() => setModal('seguimiento')}>
            <span
              className="icono-accion-tienda icono-accion-tienda--pedido"
              aria-hidden="true"
            />
            Seguir pedido
          </button>
          <button onClick={() => setModal('acceso')}>
            <span
              className="icono-accion-tienda icono-accion-tienda--cuenta"
              aria-hidden="true"
            />
            Mi cuenta
          </button>
          <button
            className="tienda__carrito"
            onClick={() => setModal('carrito')}
          >
            <span
              className="icono-accion-tienda icono-accion-tienda--carrito"
              aria-hidden="true"
            />
            Carrito · {carrito.reduce((s, i) => s + i.cantidad, 0)}
          </button>
          <a href="/">
            <img
              className="icono-gestion-tienda"
              src="/marca/favicon-circular.png"
              alt=""
            />
            Gestión
          </a>
        </nav>
        <div className="tienda__hero-contenido">
          <a href="/tienda" aria-label="Inicio de la tienda">
            <img
              className="tienda__hero-logo"
              src="/marca/logo-principal.png"
              alt="La 91 Supermercado"
            />
          </a>
          <div className="tienda__hero-texto">
            <h1>{portada.configuracion.mensaje_portada}</h1>
            <p>
              Compras para retirar o recibir en La Plata, Berisso y Ensenada.
            </p>
          </div>
        </div>
      </header>
      {!abierta && (
        <p className="tienda__aviso">
          La tienda está en preparación. Podés recorrerla, pero todavía no
          recibe pedidos.
        </p>
      )}
      {mensaje && <p className="mensaje-error tienda__mensaje">{mensaje}</p>}
      <div className="tienda__cuerpo">
        <aside>
          <h2>Categorías</h2>
          <button
            className={!categoria ? 'activo' : ''}
            onClick={() => setCategoria('')}
          >
            <span className="icono-todas" aria-hidden="true">
              ≡
            </span>
            <span>Todos</span>
          </button>
          {portada.categorias.map((c) => (
            <button
              className={String(categoria) === String(c.id) ? 'activo' : ''}
              key={c.id}
              onClick={() => setCategoria(c.id)}
            >
              {c.icono_url ? (
                <img src={c.icono_url} alt="" />
              ) : (
                <span className="tienda__icono-categoria-vacio">
                  {c.nombre.charAt(0)}
                </span>
              )}
              <span>{c.nombre}</span>
            </button>
          ))}
        </aside>
        <main>
          <div className="tienda__busqueda">
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar productos…"
              autoFocus
            />
            <span>{total} productos</span>
          </div>
          <div className="tienda__productos">
            {productos.map((p) => (
              <article key={p.id}>
                <div className="tienda__foto">
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt={p.nombre} />
                  ) : (
                    <span>LA 91</span>
                  )}
                </div>
                <small>
                  {p.categoria}
                  {p.marca ? ` · ${p.marca}` : ''}
                </small>
                <h3>{p.nombre}</h3>
                <strong>{dinero(p.precio)}</strong>
                <p>
                  {Number(p.disponible_online) > 0 ? 'Disponible' : 'Sin stock'}
                </p>
                <button
                  disabled={!abierta || Number(p.disponible_online) <= 0}
                  onClick={() => agregar(p)}
                >
                  Agregar
                </button>
              </article>
            ))}
          </div>
          {!productos.length && <p>No hay productos para esta búsqueda.</p>}
        </main>
      </div>
      {modal === 'carrito' && (
        <Modal abierto titulo="Tu compra" alCerrar={() => setModal(null)}>
          <div className="carrito">
            {carrito.map((i) => {
              const detalle = cotizacion?.detalles.find(
                (d) => Number(d.producto_id) === Number(i.id),
              );
              const tieneDescuento = Number(detalle?.descuento_producto) > 0;
              return (
                <div className="carrito__linea" key={i.id}>
                  <span>
                    {i.nombre}
                    {tieneDescuento && (
                      <small>
                        <del>{dinero(detalle.precio_unitario)} c/u</del>{' '}
                        <strong>
                          {dinero(detalle.precio_promocional_unitario)} c/u
                        </strong>
                      </small>
                    )}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={i.disponible_online}
                    value={i.cantidad}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => cambiar(i.id, e.target.value)}
                  />
                  <span className="carrito__importe">
                    {tieneDescuento && (
                      <del>{dinero(detalle.precio_unitario * i.cantidad)}</del>
                    )}
                    <strong>
                      {dinero(
                        detalle?.subtotal_promocional ?? i.precio * i.cantidad,
                      )}
                    </strong>
                    {tieneDescuento && (
                      <small>
                        Ahorrás {dinero(detalle.descuento_producto)}
                      </small>
                    )}
                  </span>
                </div>
              );
            })}
            {!carrito.length && <p>El carrito está vacío.</p>}
            {carrito.length && (
              <div className="carrito__resumen">
                <p>
                  <span>Subtotal de productos</span>
                  <strong>{dinero(cotizacion?.subtotal ?? importe)}</strong>
                </p>
                {Number(cotizacion?.descuento_productos) > 0 && (
                  <p className="carrito__descuento">
                    <span>Descuentos en productos</span>
                    <strong>-{dinero(cotizacion.descuento_productos)}</strong>
                  </p>
                )}
                <p>
                  <span>Subtotal promocionado</span>
                  <strong>
                    {dinero(cotizacion?.subtotal_promocional ?? importe)}
                  </strong>
                </p>
                {Number(cotizacion?.descuento_pedido) > 0 && (
                  <p className="carrito__descuento">
                    <span>Descuento sobre el pedido</span>
                    <strong>-{dinero(cotizacion.descuento_pedido)}</strong>
                  </p>
                )}
                <p className="carrito__total">
                  <span>Total de productos</span>
                  <strong>
                    {dinero(cotizacion?.total_productos ?? importe)}
                  </strong>
                </p>
              </div>
            )}
            <button
              className="boton"
              disabled={!carrito.length || !abierta}
              onClick={() => setModal('checkout')}
            >
              Continuar
            </button>
          </div>
        </Modal>
      )}
      {modal === 'checkout' && (
        <Modal
          abierto
          titulo="Datos de entrega y pago"
          alCerrar={() => setModal(null)}
        >
          <form className="formulario tienda__checkout" onSubmit={finalizar}>
            <label>
              Nombre
              <input name="nombre" required />
            </label>
            <label>
              Correo
              <input name="correo" type="email" required />
            </label>
            <label>
              Teléfono
              <input name="telefono" required />
            </label>
            <label>
              Entrega
              <select
                name="modalidad_entrega"
                value={modalidadCheckout}
                onChange={(e) => setModalidadCheckout(e.target.value)}
              >
                <option value="retiro">Retiro en el local</option>
                <option value="envio">Envío a domicilio</option>
              </select>
            </label>
            <fieldset>
              <legend>Dirección (solo para envío)</legend>
              <label>
                Calle
                <input name="calle" />
              </label>
              <label>
                Número
                <input name="numero" />
              </label>
              <label>
                Localidad
                <select name="localidad">
                  {['La Plata', 'Berisso', 'Ensenada'].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Zona
                <select
                  name="zona"
                  value={zonaCheckout || portada.zonas[0]?.id || ''}
                  onChange={(e) => setZonaCheckout(e.target.value)}
                >
                  {portada.zonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nombre} · {dinero(z.costo)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Distancia comprobada (km)
                <input
                  name="distancia"
                  type="number"
                  min="0"
                  max={portada.configuracion.distancia_maxima_km}
                  step="0.1"
                  defaultValue="1"
                />
              </label>
            </fieldset>
            <label>
              Medio de pago
              <select name="medio_pago">
                {portada.configuracion.permite_efectivo ? (
                  <option value="efectivo">Efectivo</option>
                ) : null}
                {portada.configuracion.permite_transferencia ? (
                  <option value="transferencia">Transferencia</option>
                ) : null}
                {portada.configuracion.permite_mercado_pago ? (
                  <option value="mercado_pago">Mercado Pago</option>
                ) : null}
              </select>
            </label>
            <div className="campo-cupon-checkout">
              <label htmlFor="cupon-checkout">Cupón</label>
              <input
                id="cupon-checkout"
                name="cupon"
                value={cuponCheckout}
                onChange={(e) => setCuponCheckout(e.target.value)}
              />
              <button
                type="button"
                className="boton boton--secundario"
                onClick={() => {
                  setMensaje('');
                  setCuponAplicado(cuponCheckout.trim());
                }}
              >
                Aplicar
              </button>
            </div>
            <label>
              Observaciones
              <textarea name="observaciones" />
            </label>
            <label className="fila-check">
              <input name="sustituciones" type="checkbox" defaultChecked />{' '}
              Acepto sustituciones similares
            </label>
            {mensaje && <p className="mensaje-error">{mensaje}</p>}
            <div className="resumen-pedido-online tienda__resumen-checkout">
              <span>
                Subtotal original{' '}
                <strong>{dinero(cotizacion?.subtotal ?? importe)}</strong>
              </span>
              <span>
                Descuentos{' '}
                <strong>
                  -
                  {dinero(
                    Number(cotizacion?.descuento_productos || 0) +
                      Number(cotizacion?.descuento_pedido || 0),
                  )}
                </strong>
              </span>
              <span>
                Envío{' '}
                <strong>
                  {costoEnvioCheckout
                    ? dinero(costoEnvioCheckout)
                    : 'Sin cargo'}
                </strong>
              </span>
              <span>
                Total a pagar <strong>{dinero(totalCheckout)}</strong>
              </span>
            </div>
            <button className="boton">
              Confirmar pedido · {dinero(totalCheckout)}
            </button>
          </form>
        </Modal>
      )}
      {modal === 'acceso' && (
        <Modal abierto titulo="Mi cuenta" alCerrar={() => setModal(null)}>
          <div className="cuenta-online">
            <form onSubmit={(e) => acceso(e, false)}>
              <h3>Ingresar</h3>
              <label>
                Correo
                <input name="correo" type="email" required />
              </label>
              <label>
                Contraseña
                <CampoClave name="clave" required />
              </label>
              <button className="boton">Ingresar</button>
            </form>
            <form onSubmit={(e) => acceso(e, true)}>
              <h3>Crear cuenta</h3>
              <label>
                Nombre
                <input name="nombre" required />
              </label>
              <label>
                Teléfono
                <input name="telefono" required />
              </label>
              <label>
                Correo
                <input name="correo" type="email" required />
              </label>
              <label>
                Contraseña
                <CampoClave name="clave" minLength="12" required />
              </label>
              <button className="boton">Registrarme</button>
            </form>
          </div>
        </Modal>
      )}
      {modal === 'resultado' && (
        <Modal abierto titulo="Pedido recibido" alCerrar={() => setModal(null)}>
          <p>
            Tu código de seguimiento es <strong>{pedido.codigo}</strong>.
          </p>
          <div className="resumen-pedido-online">
            <span>
              Subtotal <strong>{dinero(pedido.subtotal)}</strong>
            </span>
            <span>
              Descuento <strong>-{dinero(pedido.descuento)}</strong>
            </span>
            <span>
              Envío <strong>{dinero(pedido.costo_envio)}</strong>
            </span>
            <span>
              Total <strong>{dinero(pedido.total)}</strong>
            </span>
          </div>
          <p>
            Guardalo junto con el correo utilizado para consultar el pedido.
          </p>
        </Modal>
      )}
      {modal === 'seguimiento' && (
        <Modal abierto titulo="Seguir pedido" alCerrar={() => setModal(null)}>
          <form className="formulario" onSubmit={consultar}>
            <label>
              Código
              <input name="codigo" maxLength="12" required />
            </label>
            <label>
              Correo utilizado
              <input name="correo" type="email" required />
            </label>
            {mensaje && <p className="mensaje-error">{mensaje}</p>}
            <button className="boton">Consultar</button>
          </form>
        </Modal>
      )}
      {modal === 'seguimiento-resultado' && (
        <Modal
          abierto
          titulo={`Pedido #${pedido.codigo}`}
          alCerrar={() => setModal(null)}
        >
          <p>
            Estado: <strong>{pedido.estado.replaceAll('_', ' ')}</strong>
          </p>
          <p>
            Pago: <strong>{pedido.estado_pago.replaceAll('_', ' ')}</strong>
          </p>
          <p>Entrega: {pedido.modalidad_entrega}</p>
          <div className="resumen-pedido-online">
            <span>
              Subtotal <strong>{dinero(pedido.subtotal)}</strong>
            </span>
            <span>
              Descuento <strong>-{dinero(pedido.descuento)}</strong>
            </span>
            <span>
              Envío <strong>{dinero(pedido.costo_envio)}</strong>
            </span>
            <span>
              Total <strong>{dinero(pedido.total)}</strong>
            </span>
          </div>
          <h3>Productos</h3>
          {pedido.detalles.map((d) => (
            <p key={d.id}>
              {Number(d.cantidad_confirmada ?? d.cantidad_solicitada)} ×{' '}
              {d.nombre_sustituto || d.nombre_producto}
            </p>
          ))}
        </Modal>
      )}
    </div>
  );
}
