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
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="wordmark" style={{ justifyContent: 'center', marginBottom: 'calc(8px * var(--sp))' }}>
          <span className="wordmark-dot" />
          <span className="wordmark-text">Food Advisor</span>
        </div>
        <p className="login-sub">Painel pessoal</p>

        <label className="field-label" htmlFor="fa-pwd">Senha</label>
        <input
          id="fa-pwd"
          className={`field-input${error ? ' error' : ''}`}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={pw}
          onChange={e => setPw(e.target.value)}
          autoFocus
        />
        {error && <p className="field-error">{error}</p>}

        <button className="btn-primary login-btn" type="submit" disabled={loading}>
          {loading ? <><span className="spinner" /> Entrando...</> : 'Entrar'}
        </button>
        <p className="login-foot">Acesso pessoal — só você entra aqui.</p>
      </form>
    </div>
  )
}
