import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

function AppWithSW() {
  useEffect(() => {
    const enableSW = import.meta.env.VITE_ENABLE_SW === 'true'
    if (enableSW && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register(`${import.meta.env.BASE_URL}service-worker.js`)
          .catch((err) => console.error('SW registration failed', err))
      })
    }
  }, [])

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithSW />
  </StrictMode>,
)
