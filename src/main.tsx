import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { captureEntry } from './features/usuarios/navigation.ts';

const entry = captureEntry(window.location, window.history);

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el elemento raíz de Kudlab');

createRoot(root).render(
  <StrictMode>
    <App apiOrigin={import.meta.env.VITE_API_ORIGIN} initialEntry={entry} />
  </StrictMode>,
);
