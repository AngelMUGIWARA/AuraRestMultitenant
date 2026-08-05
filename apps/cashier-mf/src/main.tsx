import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// ✅ OPTIMIZACIÓN: Deshabilitar StrictMode en dev (evita 2x render)
// En dev StrictMode renderiza 2x para detectar bugs, en prod es 1x
const RootComponent = process.env.NODE_ENV === 'development' ? <App /> : <StrictMode><App /></StrictMode>;

createRoot(document.getElementById('root')!).render(RootComponent);
