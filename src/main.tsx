import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for offline asset caching and instant loading
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('POSSD Document Tracking System: New content available, reloaded.');
  },
  onOfflineReady() {
    console.log('POSSD Document Tracking System: Static assets cached, ready for offline/intermittent network use.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
