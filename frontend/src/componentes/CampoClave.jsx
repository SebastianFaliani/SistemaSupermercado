import { useState } from 'react';

export function CampoClave({ id, ...propiedades }) {
  const [visible, setVisible] = useState(false);
  return <div className="campo-clave">
    <input id={id} {...propiedades} type={visible ? 'text' : 'password'} />
    <button type="button" className="campo-clave__alternar" onClick={() => setVisible((valor) => !valor)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
      {visible
        ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 5.3 9 5.3a15.3 15.3 0 01-2.2 2.7M6.3 6.3C4.2 7.7 3 9.3 3 9.3s3.5 5.4 9 5.4c1 0 2-.2 2.9-.5" /></svg>
        : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-5.5 9-5.5 9 5.5 9 5.5-3.5 5.5-9 5.5S3 12 3 12z" /><circle cx="12" cy="12" r="2.5" /></svg>}
    </button>
  </div>;
}
