import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal.jsx';
import { formatearFechaHora } from '../utilidades/fechas.js';

const dinero = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const fechaHoraInput = (valor = new Date()) => {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  const parte = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${parte(fecha.getMonth() + 1)}-${parte(fecha.getDate())}T${parte(fecha.getHours())}:${parte(fecha.getMinutes())}`;
};

function FormularioPromocion({ promocion, referencias, alGuardar, alCancelar, procesando }) {
  const [tipo, setTipo] = useState(promocion?.tipo || 'porcentaje');
  const [alcance, setAlcance] = useState(promocion?.ambito === 'envio' ? 'envio' : promocion?.categorias?.length ? 'categoria' : promocion?.productos?.length ? 'productos' : 'pedido');
  const [categoria, setCategoria] = useState(String(promocion?.categorias?.[0] || ''));
  const [productos, setProductos] = useState(promocion?.productos || []);
  const [busqueda, setBusqueda] = useState('');
  const resultados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    if (termino.length < 2) return [];
    return referencias.productos.filter((p) => !productos.includes(Number(p.id)) && `${p.nombre} ${p.categoria}`.toLocaleLowerCase('es').includes(termino)).slice(0, 10);
  }, [busqueda, productos, referencias.productos]);
  const elegidos = productos.map((id) => referencias.productos.find((p) => Number(p.id) === Number(id))).filter(Boolean);
  const inicio = promocion ? fechaHoraInput(promocion.fecha_desde) : fechaHoraInput();
  const fin = promocion ? fechaHoraInput(promocion.fecha_hasta) : fechaHoraInput(new Date(Date.now() + 7 * 86400000));

  function enviar(e) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const esPorcentaje = tipo.includes('porcentaje') || tipo === 'porcentaje';
    alGuardar({
      nombre: f.get('nombre'), descripcion: f.get('descripcion') || null, tipo,
      ambito: alcance === 'pedido' ? 'pedido' : alcance === 'envio' ? 'envio' : 'productos',
      porcentaje: esPorcentaje ? Number(f.get('valor')) : null,
      precio_fijo: tipo.includes('fijo') ? Number(f.get('valor')) : null,
      codigo_cupon: tipo.startsWith('cupon_') ? f.get('codigo') || null : null,
      monto_minimo: Number(f.get('minimo')), descuento_maximo: null,
      fecha_desde: f.get('desde'), fecha_hasta: f.get('hasta'),
      es_acumulable: f.get('acumulable') === 'on', es_destacada: f.get('destacada') === 'on',
      aplica_supermercado: f.get('aplica_supermercado') === 'on',
      esta_activa: promocion ? Boolean(promocion.esta_activa) : true,
      productos: alcance === 'productos' ? productos : [],
      categorias: alcance === 'categoria' && categoria ? [Number(categoria)] : [],
    });
  }

  return <form className="formulario-modal promocion-formulario" onSubmit={enviar}>
    <div className="campos-producto"><div className="campo campo--ancho"><label>Nombre</label><input name="nombre" defaultValue={promocion?.nombre || ''} required autoFocus/></div><div className="campo"><label>Tipo</label><select value={tipo} onChange={(e)=>{setTipo(e.target.value);if(e.target.value==='envio_gratis')setAlcance('envio');else if(e.target.value.startsWith('cupon_'))setAlcance('pedido')}}><option value="porcentaje">Descuento porcentual</option><option value="cupon_porcentaje">Cupón porcentual</option><option value="cupon_fijo">Cupón de importe fijo</option><option value="envio_gratis">Envío gratis</option></select></div><div className="campo"><label>Valor</label><input name="valor" type="number" min="0.01" step="0.01" defaultValue={promocion?.porcentaje ?? promocion?.precio_fijo ?? 10} disabled={tipo==='envio_gratis'} required={tipo!=='envio_gratis'}/></div></div>
    <div className="campos-producto"><div className="campo"><label>Alcance</label><select value={alcance} onChange={(e)=>setAlcance(e.target.value)} disabled={tipo==='envio_gratis'||tipo.startsWith('cupon_')}><option value="pedido">Todo el pedido</option><option value="categoria">Una categoría</option><option value="productos">Productos específicos</option>{tipo==='envio_gratis'&&<option value="envio">Envío</option>}</select></div>{alcance==='categoria'&&<div className="campo"><label>Categoría</label><select value={categoria} onChange={(e)=>setCategoria(e.target.value)} required><option value="" disabled>Seleccionar</option>{referencias.categorias.map((c)=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>}<div className="campo"><label>Monto mínimo</label><input name="minimo" type="number" min="0" step="0.01" defaultValue={promocion?.monto_minimo ?? 0}/></div>{tipo.startsWith('cupon_')&&<div className="campo"><label>Código de cupón</label><input name="codigo" defaultValue={promocion?.codigo_cupon || ''} required/></div>}</div>
    {alcance==='productos'&&<div className="selector-productos-promocion"><label>Buscar productos publicados</label><input value={busqueda} onChange={(e)=>setBusqueda(e.target.value)} placeholder="Escribí nombre o categoría"/>{resultados.length>0&&<div className="resultados-productos">{resultados.map((p)=><button type="button" key={p.id} onClick={()=>{setProductos((a)=>[...a,Number(p.id)]);setBusqueda('')}}><span>{p.nombre}</span><small>{p.categoria}</small></button>)}</div>}<div className="productos-promocion-elegidos">{elegidos.map((p)=><span key={p.id}>{p.nombre}<button type="button" aria-label={`Quitar ${p.nombre}`} onClick={()=>setProductos((a)=>a.filter((id)=>Number(id)!==Number(p.id)))}>×</button></span>)}</div>{!productos.length&&<small>Seleccioná al menos un producto.</small>}</div>}
    <div className="campos-producto"><div className="campo"><label>Desde</label><input name="desde" type="datetime-local" defaultValue={inicio} required/></div><div className="campo"><label>Hasta</label><input name="hasta" type="datetime-local" defaultValue={fin} required/></div></div>
    <div><label>Descripción</label><textarea name="descripcion" defaultValue={promocion?.descripcion || ''} rows="2"/></div><div className="lista-interruptores"><label className="fila-check"><input name="destacada" type="checkbox" defaultChecked={Boolean(promocion?.es_destacada)}/> Mostrar como destacada</label><label className="fila-check"><input name="aplica_supermercado" type="checkbox" defaultChecked={Boolean(promocion?.aplica_supermercado)} disabled={tipo==='envio_gratis'||tipo.startsWith('cupon_')}/> Aplicar también en el supermercado</label><label className="fila-check"><input name="acumulable" type="checkbox" defaultChecked={Boolean(promocion?.es_acumulable)}/> Permitir acumulación</label></div>
    <div className="modal__acciones"><button type="button" className="boton boton--secundario" onClick={alCancelar}>Cancelar</button><button className="boton" disabled={procesando||(alcance==='productos'&&!productos.length)}>{procesando?'Guardando…':promocion?'Guardar cambios':'Crear promoción'}</button></div>
  </form>;
}

export function PromocionesEcommerce({ token }) {
  const [promociones,setPromociones]=useState([]),[referencias,setReferencias]=useState({categorias:[],productos:[]}),[editando,setEditando]=useState(null),[abierto,setAbierto]=useState(false),[procesando,setProcesando]=useState(false),[mensaje,setMensaje]=useState('');
  const api=async(r,o={})=>{const x=await fetch(`/api/ecommerce/admin${r}`,{...o,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}}),d=await x.json();if(!x.ok)throw Error(d.mensaje);return d};
  const cargar=async()=>{try{const [p,r]=await Promise.all([api('/promociones'),api('/promociones-referencias')]);setPromociones(p.datos);setReferencias(r)}catch(e){setMensaje(e.message)}};
  useEffect(()=>{cargar()},[]); // eslint-disable-line react-hooks/exhaustive-deps
  const alcance=(p)=>p.ambito==='pedido'?'Todo el pedido':p.ambito==='envio'?'Envío':p.categorias?.length?`Categoría: ${referencias.categorias.find((c)=>Number(c.id)===Number(p.categorias[0]))?.nombre||''}`:`${p.productos?.length||0} productos`;
  const estado=(p)=>{if(!p.esta_activa)return{texto:'Inactiva',clase:'estado-inactivo'};const ahora=Date.now();if(new Date(p.fecha_desde).getTime()>ahora)return{texto:'Programada',clase:'estado-inactivo'};if(new Date(p.fecha_hasta).getTime()<ahora)return{texto:'Vencida',clase:'estado-inactivo'};return{texto:'Activa',clase:'estado-activo'}};
  const guardar=async(datos)=>{setProcesando(true);try{await api(editando?`/promociones/${editando.id}`:'/promociones',{method:editando?'PUT':'POST',body:JSON.stringify(datos)});setAbierto(false);setEditando(null);setMensaje(editando?'Promoción actualizada correctamente.':'Promoción creada correctamente.');await cargar()}catch(e){setMensaje(e.message)}finally{setProcesando(false)}};
  const alternar=async(p)=>{setProcesando(true);try{await api(`/promociones/${p.id}`,{method:'PUT',body:JSON.stringify({...p,fecha_desde:fechaHoraInput(p.fecha_desde),fecha_hasta:fechaHoraInput(p.fecha_hasta),esta_activa:!p.esta_activa})});setMensaje(p.esta_activa?'Promoción desactivada.':'Promoción activada.');await cargar()}catch(e){setMensaje(e.message)}finally{setProcesando(false)}};
  return <div>{mensaje&&<p className="mensaje" role="status">{mensaje}</p>}<button className="boton boton--nueva-promocion" onClick={()=>{setEditando(null);setAbierto(true)}}>Nueva promoción</button><div className="tabla-contenedor"><table><thead><tr><th>Nombre</th><th>Beneficio</th><th>Alcance</th><th>Canal</th><th>Vigencia</th><th>Estado</th><th></th></tr></thead><tbody>{promociones.map((p)=>{const estadoActual=estado(p);return <tr key={p.id}><td>{p.nombre}{p.codigo_cupon&&<small className="dato-secundario">Cupón: {p.codigo_cupon}</small>}</td><td>{p.tipo==='envio_gratis'?'Envío gratis':p.porcentaje?`${Number(p.porcentaje)}%`:dinero(p.precio_fijo)}</td><td>{alcance(p)}</td><td>{p.aplica_supermercado?'Online + supermercado':'Solo online'}</td><td>{formatearFechaHora(p.fecha_desde)}<small className="dato-secundario">hasta {formatearFechaHora(p.fecha_hasta)}</small></td><td><span className={estadoActual.clase}>{estadoActual.texto}</span></td><td><div className="acciones-tabla"><button className="boton-tabla" onClick={()=>{setEditando(p);setAbierto(true)}}>Editar</button><button className="boton-tabla" disabled={procesando} onClick={()=>alternar(p)}>{p.esta_activa?'Desactivar':'Activar'}</button></div></td></tr>})}</tbody></table></div>{!promociones.length&&<p className="vacio">No hay promociones creadas.</p>}<Modal abierto={abierto} ancho="grande" titulo={editando?'Editar promoción':'Nueva promoción'} alCerrar={()=>{setAbierto(false);setEditando(null)}}>{abierto&&<FormularioPromocion key={editando?.id||'nueva'} promocion={editando} referencias={referencias} alGuardar={guardar} alCancelar={()=>{setAbierto(false);setEditando(null)}} procesando={procesando}/>}</Modal></div>;
}
