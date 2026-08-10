import { useCallback, useEffect, useState } from 'react';
import { Modal } from './Modal.jsx';

async function pedir(ruta, token, opciones = {}) {
  const respuesta = await fetch(ruta, { ...opciones, headers: {
    Authorization: `Bearer ${token}`,
    ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
  } });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo completar la operación');
  return datos;
}

export function GestionCajas({ abierto, token, alCerrar, alActualizar }) {
  const [cajas, setCajas] = useState([]);
  const [editada, setEditada] = useState(null);
  const [modalFormulario, setModalFormulario] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [procesando, setProcesando] = useState(false);
  const cargar = useCallback(async () => {
    try { setCajas((await pedir('/api/ventas/cajas', token)).datos); }
    catch (error) { setMensaje(error.message); }
  }, [token]);
  useEffect(() => { if (abierto) cargar(); }, [abierto, cargar]);

  async function guardar(evento) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const datos = { codigo: formulario.get('codigo'), nombre: formulario.get('nombre'), esta_activa: formulario.get('esta_activa') === 'on' };
    setProcesando(true);
    try {
      await pedir(editada ? `/api/ventas/cajas/${editada.id}` : '/api/ventas/cajas', token, {
        method: editada ? 'PUT' : 'POST', body: JSON.stringify(datos),
      });
      setModalFormulario(false); setEditada(null); setMensaje(editada ? 'Caja actualizada.' : 'Caja creada.');
      await cargar(); await alActualizar();
    } catch (error) { setMensaje(error.message); }
    finally { setProcesando(false); }
  }

  function abrirFormulario(caja = null) { setEditada(caja); setModalFormulario(true); }
  return <>
    <Modal abierto={abierto} titulo="Administrar cajas" ancho="grande" alCerrar={alCerrar}>
      <div className="panel__encabezado"><div><h3>Cajas del local</h3><p className="dato-secundario">Las cajas inactivas no pueden abrirse.</p></div><button className="boton" onClick={() => abrirFormulario()}>Nueva caja</button></div>
      {mensaje && <p className="mensaje" role="status">{mensaje}</p>}
      <div className="tabla-contenedor"><table><thead><tr><th>Código</th><th>Nombre</th><th>Estado</th><th>Uso actual</th><th></th></tr></thead><tbody>
        {cajas.map((caja) => <tr key={caja.id}><td>{caja.codigo}</td><td>{caja.nombre}</td><td><span className={caja.esta_activa ? 'estado-activo' : 'estado-inactivo'}>{caja.esta_activa ? 'Activa' : 'Inactiva'}</span></td><td>{caja.sesion_abierta_id ? `Abierta por ${caja.usuario_actual}` : 'Libre'}</td><td><button className="boton-tabla" onClick={() => abrirFormulario(caja)}>Editar</button></td></tr>)}
      </tbody></table></div>
      <div className="modal__acciones"><button className="boton boton--secundario" onClick={alCerrar}>Cerrar</button></div>
    </Modal>
    <Modal abierto={modalFormulario} titulo={editada ? 'Editar caja' : 'Nueva caja'} alCerrar={() => { if (!procesando) setModalFormulario(false); }}>
      <form className="formulario-modal" onSubmit={guardar}>
        <div><label htmlFor="caja_codigo_gestion">Código</label><input id="caja_codigo_gestion" name="codigo" defaultValue={editada?.codigo || ''} minLength="2" maxLength="40" pattern="[A-Za-z0-9_-]+" placeholder="CAJA_3" required autoFocus /><small>Solo letras, números, guion y guion bajo.</small></div>
        <div><label htmlFor="caja_nombre_gestion">Nombre visible</label><input id="caja_nombre_gestion" name="nombre" defaultValue={editada?.nombre || ''} minLength="2" maxLength="100" placeholder="Caja 3" required /></div>
        <label className="filtro-verificacion"><input name="esta_activa" type="checkbox" defaultChecked={editada ? Boolean(editada.esta_activa) : true} /> Caja activa</label>
        {editada?.sesion_abierta_id && <p className="mensaje">Esta caja está abierta por {editada.usuario_actual}; no puede desactivarse hasta que cierre.</p>}
        <div className="modal__acciones"><button type="button" className="boton boton--secundario" disabled={procesando} onClick={() => setModalFormulario(false)}>Cancelar</button><button className="boton" disabled={procesando}>{procesando ? 'Guardando…' : 'Guardar caja'}</button></div>
      </form>
    </Modal>
  </>;
}
