import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Import visitor tracking service (will auto-initialize)
import './services/ipBasedVisitorTracking';

// Add type declaration for React Router future flags
declare global {
  interface Window {
    REACT_ROUTER_FUTURE_FLAGS: {
      v7_startTransition: boolean;
      v7_relativeSplatPath: boolean;
    };
  }
}

// Configure React Router future flags
if (typeof window !== 'undefined') {
  window.REACT_ROUTER_FUTURE_FLAGS = {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
