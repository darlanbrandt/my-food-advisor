'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Senha incorreta.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: '24px',
    }}>
      <div className="fade-up" style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48,
            background: 'var(--accent-subtle)',
            border: '1px solid var(--accent)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 22,
          }}>⬡</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}>Painel Pessoal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Acesso restrito
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="Senha"
            value={pw}
            onChange={e => setPw(e.target.value)}
            autoFocus
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${error ? '#d45b5b' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '12px 14px',
              color: 'var(--text-primary)',
              fontSize: 15,
              fontFamily: 'var(--font-body)',
              outline: 'none',
              transition: 'border-color .15s',
            }}
          />
          {error && (
            <p style={{ color: '#d45b5b', fontSize: 13 }}>{error}</p>
          )}
          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
