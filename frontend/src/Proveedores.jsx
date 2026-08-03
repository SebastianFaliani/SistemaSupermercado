import { useCallback, useEffect, useState } from 'react';
import { Modal } from './componentes/Modal.jsx';

async function solicitar(ruta, token, opciones = {}) {
  const respuesta = await fetch(ruta, { ...opciones, headers: {
    Authorization: `Bearer ${token}`,
    ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
  } });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo completar la operación');
  return datos;
}

function FormularioProveedor({ proveedor, alGuardar, alCancelar }) {
  return <form className="formulario-modal" onSubmit={alGuardar}>
    <div className="campos-producto">
      <div className="campo campo--ancho"><label htmlFor="proveedor_razon">Razón social</label><input id="proveedor_razon" name="razon_social" defaultValue={proveedor?.razon_social ?? ''} minLength="2" maxLength="160" required /></div>
      <div className="campo"><label htmlFor="proveedor_fantasia">Nombre comercial</label><input id="proveedor_fantasia" name="nombre_fantasia" defaultValue={proveedor?.nombre_fantasia ?? ''} maxLength="160" /></div>
      <div className="campo"><label htmlFor="proveedor_cuit">CUIT</label><input id="proveedor_cuit" name="cuit" defaultValue={proveedor?.cuit ?? ''} pattern="[0-9]{2}-?[0-9]{8}-?[0-9]" placeholder="30-12345678-9" /></div>
      <div className="campo"><label htmlFor="proveedor_iva">Condición frente al IVA</label><select id="proveedor_iva" name="condicion_iva" defaultValue={proveedor?.condicion_iva ?? ''}><option value="">Sin especificar</option><option>Responsable inscripto</option><option>Monotributista</option><option>Exento</option><option>Consumidor final</option></select></div>
      <div className="campo"><label htmlFor="proveedor_contacto">Persona de contacto</label><input id="proveedor_contacto" name="persona_contacto" defaultValue={proveedor?.persona_contacto ?? ''} maxLength="120" /></div>
      <div className="campo"><label htmlFor="proveedor_telefono">Teléfono</label><input id="proveedor_telefono" name="telefono" defaultValue={proveedor?.telefono ?? ''} maxLength="30" /></div>
      <div className="campo"><label htmlFor="proveedor_correo">Correo electrónico</label><input id="proveedor_correo" name="correo_electronico" type="email" defaultValue={proveedor?.correo_electronico ?? ''} maxLength="254" /></div>
      <div className="campo"><label htmlFor="proveedor_direccion">Dirección</label><input id="proveedor_direccion" name="direccion" defaultValue={proveedor?.direccion ?? ''} maxLength="255" /></div>
      <div className="campo campo--ancho"><label htmlFor="proveedor_observaciones">Observaciones</label><textarea id="proveedor_observaciones" name="observaciones" defaultValue={proveedor?.observaciones ?? ''} maxLength="500" rows="3" /></div>
      {proveedor && <label className="filtro-verificacion campo--ancho"><input name="esta_activo" type="checkbox" defaultChecked={Boolean(proveedor.esta_activo)} /> Proveedor activo</label>}
    </div>
    <div className="modal__acciones"><button type="button" className="boton boton--secundario" onClick={alCancelar}>Cancelar</button><button className="boton">{proveedor ? 'Guardar cambios' : 'Crear proveedor'}</button></div>
  </form>;
}

export function Proveedores({ token, permisos }) {
  const [proveedores, setProveedores] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('activos');
  const [proveedorEditado, setProveedorEditado] = useState(undefined);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const limite = 25;
  const puedeGestionar = permisos.includes('compras.gestionar');

  const cargar = useCallback(async () => {
    try {
      const parametros = new URLSearchParams({ pagina: String(pagina), limite: String(limite), estado });
      if (buscar) parametros.set('buscar', buscar);
      const respuesta = await solicitar(`/api/proveedores?${parametros}`, token);
      setProveedores(respuesta.datos); setTotal(respuesta.total);
    } catch (error) { setMensaje(error.message); }
  }, [token, pagina, buscar, estado]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const temporizador = setTimeout(() => { setPagina(1); setBuscar(textoBusqueda.trim()); }, 300);
    return () => clearTimeout(temporizador);
  }, [textoBusqueda]);

  async function guardar(evento) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const opcional = (nombre) => formulario.get(nombre) || null;
    const datos = {
      razon_social: formulario.get('razon_social'), nombre_fantasia: opcional('nombre_fantasia'),
      cuit: opcional('cuit'), condicion_iva: opcional('condicion_iva'),
      persona_contacto: opcional('persona_contacto'), telefono: opcional('telefono'),
      correo_electronico: opcional('correo_electronico'), direccion: opcional('direccion'),
      observaciones: opcional('observaciones'),
      ...(proveedorEditado ? { esta_activo: formulario.get('esta_activo') === 'on' } : {}),
    };
    try {
      await solicitar(proveedorEditado ? `/api/proveedores/${proveedorEditado.id}` : '/api/proveedores', token, {
        method: proveedorEditado ? 'PUT' : 'POST', body: JSON.stringify(datos),
      });
      setModalAbierto(false); setProveedorEditado(undefined);
      setMensaje(proveedorEditado ? 'Proveedor actualizado correctamente.' : 'Proveedor creado correctamente.');
      await cargar();
    } catch (error) { setMensaje(error.message); }
  }

  const paginas = Math.max(1, Math.ceil(total / limite));
  return <section className="modulo">
    <div className="modulo__encabezado"><div><p className="etiqueta">COMPRAS</p><h2>Proveedores</h2></div>{puedeGestionar && <button className="boton" onClick={() => { setProveedorEditado(undefined); setModalAbierto(true); }}>Nuevo proveedor</button>}</div>
    <div className="barra-filtros" role="search"><input value={textoBusqueda} onChange={(evento) => setTextoBusqueda(evento.target.value)} placeholder="Buscar por razón social, nombre, CUIT o contacto" /><select aria-label="Filtrar por estado" value={estado} onChange={(evento) => { setEstado(evento.target.value); setPagina(1); }}><option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos los estados</option></select></div>
    <p className="filtro-activo">Mostrando {total.toLocaleString('es-AR')} proveedores{buscar ? ` para “${buscar}”` : ''}.</p>
    {mensaje && <p className="mensaje" role="status">{mensaje}</p>}
    <article className="panel"><div className="panel__encabezado"><h3>Padrón de proveedores</h3><span>Página {pagina} de {paginas}</span></div>
      {proveedores.length ? <div className="tabla-contenedor"><table><thead><tr><th>Proveedor</th><th>CUIT</th><th>Contacto</th><th>Teléfono</th><th>Estado</th>{puedeGestionar && <th></th>}</tr></thead><tbody>{proveedores.map((proveedor) => <tr key={proveedor.id}><td><span>{proveedor.nombre_fantasia || proveedor.razon_social}</span>{proveedor.nombre_fantasia && <small className="dato-secundario">{proveedor.razon_social}</small>}</td><td>{proveedor.cuit || '—'}</td><td>{proveedor.persona_contacto || proveedor.correo_electronico || '—'}</td><td>{proveedor.telefono || '—'}</td><td><span className={proveedor.esta_activo ? 'estado-activo' : 'estado-inactivo'}>{proveedor.esta_activo ? 'Activo' : 'Inactivo'}</span></td>{puedeGestionar && <td><button className="boton-tabla" onClick={() => { setProveedorEditado(proveedor); setModalAbierto(true); }}>Editar</button></td>}</tr>)}</tbody></table></div> : <p className="vacio">Todavía no hay proveedores para mostrar.</p>}
      <div className="paginacion"><button disabled={pagina === 1} onClick={() => setPagina((valor) => valor - 1)}>Anterior</button><button disabled={pagina >= paginas} onClick={() => setPagina((valor) => valor + 1)}>Siguiente</button></div>
    </article>
    <Modal abierto={modalAbierto} titulo={proveedorEditado ? 'Editar proveedor' : 'Nuevo proveedor'} ancho="grande" alCerrar={() => { setModalAbierto(false); setProveedorEditado(undefined); }}><FormularioProveedor key={proveedorEditado?.id ?? 'nuevo'} proveedor={proveedorEditado} alGuardar={guardar} alCancelar={() => { setModalAbierto(false); setProveedorEditado(undefined); }} /></Modal>
  </section>;
}
