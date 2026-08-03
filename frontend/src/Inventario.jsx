import { useCallback, useEffect, useState } from 'react';
import { Modal } from './componentes/Modal.jsx';

async function solicitar(ruta, token, opciones = {}) {
  const respuesta = await fetch(ruta, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo completar la operación');
  return datos;
}

export function Inventario({ token, permisos }) {
  const [existencias, setExistencias] = useState([]);
  const [total, setTotal] = useState(0);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [buscar, setBuscar] = useState('');
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [productoAjuste, setProductoAjuste] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const limite = 25;
  const puedeAjustar = permisos.includes('stock.ajustar');

  const cargar = useCallback(async () => {
    try {
      const parametros = new URLSearchParams({
        pagina: String(pagina),
        limite: String(limite),
        solo_bajo_minimo: String(soloBajoMinimo),
      });
      if (buscar) parametros.set('buscar', buscar);
      const respuesta = await solicitar(`/api/inventario/stock?${parametros}`, token);
      setExistencias(respuesta.datos);
      setTotal(respuesta.total);
    } catch (error) { setMensaje(error.message); }
  }, [token, pagina, buscar, soloBajoMinimo]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setPagina(1);
      setBuscar(textoBusqueda.trim());
    }, 300);
    return () => clearTimeout(temporizador);
  }, [textoBusqueda]);

  async function guardarAjuste(evento) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    try {
      await solicitar('/api/inventario/ajustes', token, {
        method: 'POST',
        body: JSON.stringify({
          producto_id: productoAjuste.producto_id,
          ubicacion_id: productoAjuste.ubicacion_id,
          cantidad_nueva: Number(formulario.get('cantidad_nueva')),
          motivo: formulario.get('motivo'),
        }),
      });
      setProductoAjuste(null);
      setMensaje('Stock ajustado y movimiento registrado.');
      await cargar();
    } catch (error) { setMensaje(error.message); }
  }

  const paginas = Math.max(1, Math.ceil(total / limite));

  return (
    <section className="modulo">
      <div className="modulo__encabezado">
        <div><p className="etiqueta">INVENTARIO</p><h2>Existencias del local</h2></div>
      </div>
      <div className="barra-filtros" role="search">
        <input value={textoBusqueda} onChange={(evento) => setTextoBusqueda(evento.target.value)} placeholder="Buscar por producto o código de barras" />
        <label className="filtro-verificacion"><input type="checkbox" checked={soloBajoMinimo} onChange={(evento) => { setSoloBajoMinimo(evento.target.checked); setPagina(1); }} /> Solo bajo mínimo</label>
      </div>
      <p className="filtro-activo">Mostrando {total.toLocaleString('es-AR')} productos{soloBajoMinimo ? ' bajo el mínimo' : ''}{buscar ? ` para “${buscar}”` : ''}.</p>
      {mensaje && <p className="mensaje" role="status">{mensaje}</p>}
      <article className="panel">
        <div className="panel__encabezado"><h3>Stock actual</h3><span>Página {pagina} de {paginas}</span></div>
        <div className="tabla-contenedor">
          <table><thead><tr><th></th><th>Producto</th><th>Código</th><th>Disponible</th><th>Reservado</th><th>Mínimo</th>{puedeAjustar && <th></th>}</tr></thead>
            <tbody>{existencias.map((item) => <tr key={item.producto_id}>
              <td>{item.imagen_url ? <img className="miniatura-producto" src={item.imagen_url} alt="" /> : <span className="miniatura-vacia" />}</td>
              <td>{item.nombre}</td><td>{item.codigo_barra}</td>
              <td className={Number(item.cantidad) < Number(item.stock_minimo) ? 'cantidad-baja' : ''}>{Number(item.cantidad).toLocaleString('es-AR')}</td>
              <td>{Number(item.cantidad_reservada).toLocaleString('es-AR')}</td><td>{Number(item.stock_minimo).toLocaleString('es-AR')}</td>
              {puedeAjustar && <td><button className="boton-tabla" onClick={() => setProductoAjuste(item)}>Ajustar</button></td>}
            </tr>)}</tbody>
          </table>
        </div>
        <div className="paginacion"><button disabled={pagina === 1} onClick={() => setPagina((valor) => valor - 1)}>Anterior</button><button disabled={pagina >= paginas} onClick={() => setPagina((valor) => valor + 1)}>Siguiente</button></div>
      </article>

      <Modal abierto={Boolean(productoAjuste)} titulo="Ajustar stock" alCerrar={() => setProductoAjuste(null)}>
        {productoAjuste && <form className="formulario-modal" onSubmit={guardarAjuste}>
          <p><strong>{productoAjuste.nombre}</strong></p>
          <p>Stock actual: {Number(productoAjuste.cantidad).toLocaleString('es-AR')}</p>
          <div><label htmlFor="cantidad_nueva">Cantidad física contada</label><input id="cantidad_nueva" name="cantidad_nueva" type="number" min="0" step="0.001" defaultValue={productoAjuste.cantidad} required /></div>
          <div><label htmlFor="motivo_ajuste">Motivo del ajuste</label><textarea id="motivo_ajuste" name="motivo" minLength="5" maxLength="255" rows="3" required /></div>
          <div className="modal__acciones"><button type="button" className="boton boton--secundario" onClick={() => setProductoAjuste(null)}>Cancelar</button><button className="boton">Registrar ajuste</button></div>
        </form>}
      </Modal>
    </section>
  );
}
