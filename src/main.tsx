import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PWAProvider } from './contexts/PWAContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PWAProvider>
      <App />
    </PWAProvider>
  </StrictMode>,
)
