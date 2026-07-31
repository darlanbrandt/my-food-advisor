'use client'
import { useEffect, useState } from 'react'

/* Botão "Instalar" para a top bar.
   - Chrome/Android/desktop: captura o evento beforeinstallprompt e dispara o
     prompt nativo ao clicar. Some depois de instalado.
   - iOS/Safari: não há beforeinstallprompt — mostra uma dica de como adicionar
     à tela de início.
   - Já instalado (standalone): não renderiza nada. */

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

export default function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showIos, setShowIos] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return }
    if (isIOS()) { setShowIos(true); return }

    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent) }
    const onInstalled = () => { setInstalled(true); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // fecha a dica do iOS com Esc / clique fora
  useEffect(() => {
    if (!iosHint) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIosHint(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [iosHint])

  if (installed) return null

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice.catch(() => {})
    setDeferred(null)
  }

  // iOS — sem prompt nativo, mostra instrução
  if (showIos) {
    return (
      <div className="dp-wrap">
        <button
          className="link-btn"
          onClick={() => setIosHint(v => !v)}
          aria-expanded={iosHint}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <DownloadIcon /> Instalar
        </button>
        {iosHint && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setIosHint(false)} />
            <div
              className="dp-popup"
              style={{ width: 224, left: 'auto', right: 0, zIndex: 30, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}
            >
              Toque em <strong style={{ color: 'var(--text-primary)' }}>Compartilhar</strong> e
              depois em <strong style={{ color: 'var(--text-primary)' }}>Adicionar à Tela de Início</strong>.
            </div>
          </>
        )}
      </div>
    )
  }

  // Chrome/Android/desktop — só aparece quando instalável
  if (!deferred) return null

  return (
    <button
      className="link-btn"
      onClick={install}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      <DownloadIcon /> Instalar
    </button>
  )
}
