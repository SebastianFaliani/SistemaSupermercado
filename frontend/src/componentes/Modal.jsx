import { useEffect } from 'react';

export function Modal({ abierto, titulo, alCerrar, children, ancho = 'normal' }) {
  useEffect(() => {
    if (!abierto) return undefined;
    const cerrarConEscape = (evento) => {
      if (evento.key === 'Escape') alCerrar();
    };
    document.addEventListener('keydown', cerrarConEscape);
    document.body.classList.add('modal-abierto');
    return () => {
      document.removeEventListener('keydown', cerrarConEscape);
      document.body.classList.remove('modal-abierto');
    };
  }, [abierto, alCerrar]);

  if (!abierto) return null;

  return (
    <div className="modal-fondo" role="presentation" onMouseDown={(evento) => {
      if (evento.target === evento.currentTarget) alCerrar();
    }}>
      <section className={`modal modal--${ancho}`} role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <header className="modal__encabezado">
          <h2 id="modal-titulo">{titulo}</h2>
          <button type="button" className="modal__cerrar" onClick={alCerrar} aria-label="Cerrar">×</button>
        </header>
        <div className="modal__contenido">{children}</div>
      </section>
    </div>
  );
}
