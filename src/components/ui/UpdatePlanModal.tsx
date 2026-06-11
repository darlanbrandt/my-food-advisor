'use client'
import { useState } from 'react'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

export default function UpdatePlanModal({ onClose, onSuccess }: Props) {
  const [json, setJson] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')

    // Valida o JSON antes de enviar
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      setError('JSON inválido. Verifique a formatação.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(parsed as object), label: label || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao salvar plano.')
        return
      }

      onSuccess()
      onClose()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 51,
        width: '100%',
        maxWidth: 560,
        padding: '0 16px',
      }}>
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
                Atualizar plano
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Cole o JSON do novo plano gerado
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-tertiary)', cursor: 'pointer',
                fontSize: 20, lineHeight: 1, padding: 4,
              }}
            >×</button>
          </div>

          {/* Label opcional */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Nome do plano <span style={{ color: 'var(--text-tertiary)' }}>(opcional)</span>
            </label>
            <input
              type="text"
              placeholder='ex: Semana 24 — jun 2025'
              value={label}
              onChange={e => setLabel(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '9px 12px',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
            />
          </div>

          {/* Textarea JSON */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              JSON do plano <span style={{ color: 'var(--text-danger, #d45b5b)' }}>*</span>
            </label>
            <textarea
              value={json}
              onChange={e => setJson(e.target.value)}
              placeholder='Cole o JSON aqui...'
              rows={10}
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                border: `1px solid ${error ? '#d45b5b' : 'var(--border)'}`,
                borderRadius: 8,
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Erro */}
          {error && (
            <p style={{ fontSize: 13, color: '#d45b5b', marginTop: -8 }}>{error}</p>
          )}

          {/* Ações */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading || !json.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</>
              ) : 'Salvar plano'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
