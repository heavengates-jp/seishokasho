import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

function AppWithSW() {
  useEffect(() => {
    const redirect = sessionStorage.getItem('redirect')
    if (redirect) {
      window.history.replaceState(null, '', redirect)
      sessionStorage.removeItem('redirect')
    }
    if ('serviceWorker' in navigator) {
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
