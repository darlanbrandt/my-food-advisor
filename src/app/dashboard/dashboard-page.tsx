'use client'
import { useEffect, useState, useCallback } from 'react'
import MealPlanWidget from '@/components/ui/MealPlanWidget'
import UpdatePlanModal from '@/components/ui/UpdatePlanModal'

type PlanData = {
  meta?: { id: number; created_at: string; label: string }
  days: Array<{
    day: string
    meals: {
      morning_snack: Meal
      lunch: Meal
      afternoon_snack: Meal
      dinner: Meal
    }
  }>
  shopping_list: Record<string, string[]>
  substitutions: Array<{ status: string; title: string; body: string }>
  esophagitis_tips: { avoid: string[]; habits: string[]; lactose: string[] }
}

type Meal = { name: string; detail: string; tags: string[] }

export default function DashboardPage() {
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const fetchPlan = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/meal-plan')
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Não foi possível carregar o plano.')
        return
      }
      const data = await res.json()
      setPlan(data)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 28,
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--text-primary)',
            lineHeight: 1.2,
            marginBottom: 4,
          }}>
            Plano alimentar
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {plan?.meta?.label ?? 'Personalizado para esofagite e zero lactose'}
          </p>
        </div>

        <button
          className="btn-ghost"
          onClick={() => setModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
        >
          <span style={{ fontSize: 14 }}>↑</span> Atualizar plano
        </button>
      </div>

      {/* Estados */}
      {loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 16, padding: '80px 0',
          color: 'var(--text-secondary)', fontSize: 14,
        }}>
          <div className="spinner" />
          <span>Carregando plano...</span>
        </div>
      )}

      {error && !loading && (
        <div style={{
          background: '#2a1010', border: '1px solid #d45b5b',
          borderRadius: 10, padding: '14px 18px',
          color: '#d45b5b', fontSize: 14, marginBottom: 20,
        }}>
          {error}{' '}
          <button onClick={fetchPlan} style={{
            background: 'none', border: 'none', color: '#d45b5b',
            cursor: 'pointer', textDecoration: 'underline', fontSize: 14,
          }}>
            Tentar novamente
          </button>
        </div>
      )}

      {plan && !loading && <MealPlanWidget plan={plan} />}

      {/* Modal */}
      {modalOpen && (
        <UpdatePlanModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => fetchPlan()}
        />
      )}
    </div>
  )
}
