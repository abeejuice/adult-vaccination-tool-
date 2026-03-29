import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            border: '1px solid rgba(148,163,184,0.15)',
            color: '#e2e8f0',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
)
