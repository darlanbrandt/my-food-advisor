'use client'
import { useEffect, useState, useCallback } from 'react'
import MealPlanWidget, { PlanData } from '@/components/ui/MealPlanWidget'

export default function DashboardPage() {
  const [plan,       setPlan]       = useState<PlanData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [modalOpen,  setModalOpen]  = useState(false)

  const fetchPlan = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/meal-plan')
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Não foi possível carregar o plano.'); return }
      setPlan(data)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '80px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
      <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'var(--border-strong)', borderTopColor: 'var(--accent)' }} />
      Carregando plano...
    </div>
  )

  if (error) return (
    <div style={{ marginTop: 32 }}>
      <div style={{ background: 'color-mix(in oklab, var(--c-red) 10%, var(--bg-surface))', border: '1px solid color-mix(in oklab, var(--c-red) 30%, var(--border))', borderRadius: 10, padding: '13px 16px', color: 'var(--c-red)', fontSize: 13, display: 'flex', gap: 12, alignItems: 'center' }}>
        {error}
        <button onClick={fetchPlan} style={{ background: 'none', border: 'none', color: 'var(--c-red)', cursor: 'pointer', textDecoration: 'underline', fontSize: 13, fontFamily: 'var(--font-ui)', marginLeft: 'auto' }}>
          Tentar novamente
        </button>
      </div>
    </div>
  )

  if (!plan) return null

  return (
    <MealPlanWidget
      plan={plan}
      onUpdateClick={() => setModalOpen(true)}
      showModal={modalOpen}
      onModalClose={() => setModalOpen(false)}
      onModalSuccess={fetchPlan}
    />
  )
}
