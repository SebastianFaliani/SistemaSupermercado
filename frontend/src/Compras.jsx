import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from './componentes/Modal.jsx';

async function pedir(ruta, token, opciones = {}) {
  const respuesta = await fetch(ruta, { ...opciones, headers: { Authorization: `Bearer ${token}`, ...(opciones.body ? { 'Content-Type': 'application/json' } : {}) } });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo completar la operación');
  return datos;
}

export function Compras({ token, permisos }) {
  const [compras, setCompras] = useState([]); const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1); const [estado, setEstado] = useState('todos');
  const [texto, setTexto] = useState(''); const [buscar, setBuscar] = useState('');
  const [referencias, setReferencias] = useState({ proveedores: [], productos: [] });
  const [modal, setModal] = useState(false); const [items, setItems] = useState([]);
  const [ordenActual, setOrdenActual] = useState(null);
  const [compraARecibir, setCompraARecibir] = useState(null);
  const [recibiendo, setRecibiendo] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState(''); const [mensaje, setMensaje] = useState('');
  const limite = 25;

  const cargar = useCallback(async () => {
    try {
      const parametros = new URLSearchParams({ pagina: String(pagina), limite: String(limite), estado });
      if (buscar) parametros.set('buscar', buscar);
      const [respuestaCompras, respuestaReferencias] = await Promise.all([pedir(`/api/compras?${parametros}`, token), pedir('/api/compras/referencias', token)]);
      setCompras(respuestaCompras.datos); setTotal(respuestaCompras.total); setReferencias(respuestaReferencias);
    } catch (error) { setMensaje(error.message); }
  }, [token, pagina, estado, buscar]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { const temporizador = setTimeout(() => { setPagina(1); setBuscar(texto.trim()); }, 300); return () => clearTimeout(temporizador); }, [texto]);

  const resultados = useMemo(() => {
    const termino = busquedaProducto.trim().toLocaleLowerCase('es');
    if (termino.length < 2) return [];
    const agregados = new Set(items.map((item) => item.producto_id));
    return referencias.productos.filter((producto) => !agregados.has(producto.id)
      && (`${producto.nombre} ${producto.codigo_barra || ''}`).toLocaleLowerCase('es').includes(termino)).slice(0, 12);
  }, [busquedaProducto, referencias.productos, items]);

  function agregar(producto) { setItems((actual) => [...actual, { producto_id: producto.id, nombre: producto.nombre, codigo_barra: producto.codigo_barra, es_pesable: producto.es_pesable, cantidad: 1, costo_unitario: Number(producto.precio_costo) }]); setBusquedaProducto(''); }
  function cambiar(id, campo, valor) { setItems((actual) => actual.map((item) => item.producto_id === id ? { ...item, [campo]: valor } : item)); }
  function cerrarModal() { setModal(false); setItems([]); setBusquedaProducto(''); setOrdenActual(null); }
  async function abrirOrden(compra) {
    try {
      const respuesta = await pedir(`/api/compras/${compra.id}`, token);
      setOrdenActual(respuesta.dato);
      setItems(respuesta.dato.detalles.map((item) => ({ ...item, cantidad: Number(item.cantidad), costo_unitario: Number(item.costo_unitario) })));
      setModal(true);
    } catch (error) { setMensaje(error.message); }
  }

  async function guardar(evento) {
    evento.preventDefault(); const formulario = new FormData(evento.currentTarget);
    try {
      const ruta = ordenActual ? `/api/compras/${ordenActual.id}` : '/api/compras';
      await pedir(ruta, token, { method: ordenActual ? 'PUT' : 'POST', body: JSON.stringify({ proveedor_id: Number(formulario.get('proveedor_id')), fecha_esperada: formulario.get('fecha_esperada') || null, observaciones: formulario.get('observaciones') || null, detalles: items.map((item) => ({ producto_id: item.producto_id, cantidad: Number(item.cantidad), costo_unitario: Number(item.costo_unitario) })) }) });
      const fueEdicion = Boolean(ordenActual); cerrarModal(); setMensaje(fueEdicion ? 'Orden actualizada correctamente.' : 'Orden de compra creada como borrador.'); await cargar();
    } catch (error) { setMensaje(error.message); }
  }
  async function recibir() {
    setRecibiendo(true);
    try {
      const respuesta = await pedir(`/api/compras/${compraARecibir.id}/recibir`, token, { method: 'POST' });
      setCompraARecibir(null);
      setMensaje(`${respuesta.dato.productos_recibidos} productos ingresaron al stock.`);
      await cargar();
    } catch (error) {
      setCompraARecibir(null);
      setMensaje(error.message);
    } finally { setRecibiendo(false); }
  }

  const paginas = Math.max(1, Math.ceil(total / limite));
  const totalOrden = items.reduce((suma, item) => suma + Number(item.cantidad || 0) * Number(item.costo_unitario || 0), 0);
  const soloLectura = Boolean(ordenActual && ordenActual.estado !== 'borrador');
  return <section className="modulo">
    <div className="modulo__encabezado"><div><p className="etiqueta">COMPRAS</p><h2>Órdenes de compra</h2></div>{permisos.includes('compras.gestionar') && <button className="boton" onClick={() => { setOrdenActual(null); setItems([]); setModal(true); }}>Nueva orden</button>}</div>
    <div className="barra-filtros"><input value={texto} onChange={(evento) => setTexto(evento.target.value)} placeholder="Buscar por número o proveedor" /><select value={estado} onChange={(evento) => { setEstado(evento.target.value); setPagina(1); }}><option value="todos">Todos los estados</option><option value="borrador">Borradores</option><option value="enviada">Enviadas</option><option value="recibida">Recibidas</option><option value="cancelada">Canceladas</option></select></div>
    <p className="filtro-activo">Mostrando {total} órdenes.</p>{mensaje && <p className="mensaje">{mensaje}</p>}
    <article className="panel"><div className="panel__encabezado"><h3>Compras</h3><span>Página {pagina} de {paginas}</span></div>{compras.length ? <div className="tabla-contenedor"><table><thead><tr><th>Número</th><th>Fecha</th><th>Proveedor</th><th>Productos</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>{compras.map((compra) => <tr key={compra.id}><td>#{compra.id}</td><td>{new Date(compra.fecha_creacion).toLocaleDateString('es-AR')}</td><td>{compra.proveedor}</td><td>{compra.productos}</td><td>${Number(compra.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td><td><span className="estado-activo">{compra.estado}</span></td><td className="acciones-tabla"><button className="boton-tabla" onClick={() => abrirOrden(compra)}>{compra.estado === 'borrador' ? 'Editar' : 'Ver'}</button>{['borrador', 'enviada'].includes(compra.estado) && permisos.includes('compras.gestionar') && <button className="boton-tabla" onClick={() => setCompraARecibir(compra)}>Recibir</button>}</td></tr>)}</tbody></table></div> : <p className="vacio">Todavía no hay órdenes de compra.</p>}<div className="paginacion"><button disabled={pagina === 1} onClick={() => setPagina((valor) => valor - 1)}>Anterior</button><button disabled={pagina >= paginas} onClick={() => setPagina((valor) => valor + 1)}>Siguiente</button></div></article>
    <Modal abierto={modal} titulo={ordenActual ? `${soloLectura ? 'Detalle' : 'Editar'} compra #${ordenActual.id}` : 'Nueva orden de compra'} ancho="grande" alCerrar={cerrarModal}><form className="formulario-modal" onSubmit={guardar}>
      {ordenActual && <p className="detalle-estado">Estado: <span className="estado-activo">{ordenActual.estado}</span></p>}
      <div className="campos-producto"><div className="campo"><label>Proveedor</label><select name="proveedor_id" required defaultValue={ordenActual?.proveedor_id ?? ''} disabled={soloLectura}><option value="" disabled>Seleccionar</option>{referencias.proveedores.map((proveedor) => <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre_fantasia || proveedor.razon_social}</option>)}</select></div><div className="campo"><label>Entrega esperada</label><input name="fecha_esperada" type="date" defaultValue={ordenActual?.fecha_esperada?.slice(0, 10) ?? ''} disabled={soloLectura} /></div></div>
      {!soloLectura && <div className="buscador-productos-compra"><label htmlFor="buscar_producto_compra">Buscar productos</label><input id="buscar_producto_compra" value={busquedaProducto} onChange={(evento) => setBusquedaProducto(evento.target.value)} placeholder="Escribí nombre o código de barras" autoComplete="off" />
        {resultados.length > 0 && <div className="resultados-productos">{resultados.map((producto) => <button type="button" key={producto.id} onClick={() => agregar(producto)}><span>{producto.nombre}</span><small>{producto.codigo_barra || 'Sin código'} · Costo ${Number(producto.precio_costo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</small></button>)}</div>}
      </div>}
      {items.length ? <div className="tabla-contenedor tabla-items-compra"><table><thead><tr><th>Producto agregado</th><th>Cantidad</th><th>Costo unitario</th><th>Subtotal</th>{!soloLectura && <th></th>}</tr></thead><tbody>{items.map((item) => <tr key={item.producto_id}><td>{item.nombre}<small className="dato-secundario">{item.codigo_barra || 'Sin código'}</small></td><td><input type="number" min={item.es_pesable ? '0.001' : '1'} step={item.es_pesable ? '0.001' : '1'} value={item.cantidad} disabled={soloLectura} onFocus={(evento) => evento.currentTarget.select()} onChange={(evento) => cambiar(item.producto_id, 'cantidad', evento.target.value)} required /></td><td><input type="number" min="0" step="0.01" value={item.costo_unitario} disabled={soloLectura} onFocus={(evento) => evento.currentTarget.select()} onChange={(evento) => cambiar(item.producto_id, 'costo_unitario', evento.target.value)} required /></td><td>${(Number(item.cantidad) * Number(item.costo_unitario)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>{!soloLectura && <td><button type="button" className="boton-tabla" onClick={() => setItems((actual) => actual.filter((otro) => otro.producto_id !== item.producto_id))}>Quitar</button></td>}</tr>)}</tbody></table></div> : <p className="vacio">Buscá y agregá al menos un producto.</p>}
      <div><label>Observaciones</label><textarea name="observaciones" maxLength="500" rows="2" defaultValue={ordenActual?.observaciones ?? ''} disabled={soloLectura} /></div><p className="total-compra">Total: <strong>${totalOrden.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></p><div className="modal__acciones"><button type="button" className="boton boton--secundario" onClick={cerrarModal}>{soloLectura ? 'Cerrar' : 'Cancelar'}</button>{!soloLectura && <button className="boton" disabled={!items.length}>{ordenActual ? 'Guardar cambios' : 'Crear borrador'}</button>}</div>
    </form></Modal>
    <Modal abierto={Boolean(compraARecibir)} titulo="Confirmar recepción" alCerrar={() => { if (!recibiendo) setCompraARecibir(null); }}>
      {compraARecibir && <div className="confirmacion-modal">
        <p>¿Confirmar la recepción de la compra <strong>#{compraARecibir.id}</strong>?</p>
        <p>Ingresarán <strong>{compraARecibir.productos} productos</strong> al inventario. Esta acción modificará el stock y no podrá editarse posteriormente.</p>
        <div className="modal__acciones"><button type="button" className="boton boton--secundario" disabled={recibiendo} onClick={() => setCompraARecibir(null)}>Cancelar</button><button type="button" className="boton" disabled={recibiendo} onClick={recibir}>{recibiendo ? 'Recibiendo…' : 'Confirmar recepción'}</button></div>
      </div>}
    </Modal>
  </section>;
}
