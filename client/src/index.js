import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global CSS reset and Hebrew font setup
const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    direction: rtl;
    text-align: right;
    background-color: #f8f9fa;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
  }

  /* Hebrew text improvements */
  input, textarea, select {
    font-family: 'Heebo', sans-serif;
  }

  /* Accessibility improvements */
  button:focus,
  input:focus,
  select:focus,
  textarea:focus {
    outline: 2px solid #3498db;
    outline-offset: 2px;
  }

  /* Print styles */
  @media print {
    body {
      background: white;
    }
    
    .no-print {
      display: none !important;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    body {
      background: white;
      color: black;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

// Inject global styles
const styleSheet = document.createElement('style');
styleSheet.textContent = globalStyles;
document.head.appendChild(styleSheet);

// Create root and render app
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Error boundary for development
if (process.env.NODE_ENV === 'development') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });

  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });
}
