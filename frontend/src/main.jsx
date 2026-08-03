import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Aplicacion } from './Aplicacion.jsx';
import './estilos.css';

createRoot(document.getElementById('root')).render(
  createElement(StrictMode, null, createElement(Aplicacion)),
);
