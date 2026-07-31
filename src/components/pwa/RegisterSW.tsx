'use client'
import { useEffect } from 'react'

/* Registra o service worker (/sw.js) após o load da página.
   Falhas são silenciosas — o app funciona normalmente sem o SW. */
export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const register = () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) }
    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }
  }, [])
  return null
}
