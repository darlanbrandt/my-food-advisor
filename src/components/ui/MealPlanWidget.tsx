'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import GoalsTab from '@/components/ui/GoalsTab'

/* ── tipos ─────────────────────────────────────────────────── */
type Meal = { name: string; detail: string; tags: string[] }
type Day  = { day: string; meals: Record<string, Meal> }
export type PlanData = {
  meta?: { id: number; created_at: string; label: string }
  days: Day[]
  shopping_list: Record<string, string[]>
  substitutions: Array<{ status: string; title: string; body: string }>
  esophagitis_tips: { avoid: string[]; habits: string[]; lactose: string[] }
}

/* ── constantes ─────────────────────────────────────────────── */
const TABS = [
  { id: 'plan',     label: 'Plano semanal' },
  { id: 'goals',    label: 'Metas' },
  { id: 'shopping', label: 'Lista de compras' },
  { id: 'subs',     label: 'Substituições' },
  { id: 'tips',     label: 'Dicas esofagite' },
]

const MEAL_LABELS: Record<string, string> = {
  morning_snack:   'Lanche da manhã',
  lunch:           'Almoço',
  afternoon_snack: 'Lanche da tarde',
  dinner:          'Jantar',
}

// janelas em horas decimais
const MEAL_WINDOWS: Record<string, [number, number]> = {
  morning_snack:   [9.5,  11],
  lunch:           [12,   13.5],
  afternoon_snack: [15.5, 17],
  dinner:          [19,   20.5],
}

const TAG_COLOR: Record<string, string> = {
  'proteína':    'var(--c-blue)',
  'fibra':       'var(--c-green)',
  'esofagite ok':'var(--c-amber)',
}

const SUB_BADGE: Record<string, { color: string; label: string }> = {
  'manter':      { color: 'var(--c-blue)',      label: 'Manter' },
  'não aplica':  { color: 'var(--text-tertiary)',label: 'Não se aplica' },
  'custo':       { color: 'var(--c-red)',        label: 'Custo alto' },
  'swap':        { color: 'var(--accent-ink)',   label: 'Ativo no plano' },
}

function todayIndex() { return (new Date().getDay() + 6) % 7 }

/* ── hook: refeição atual ───────────────────────────────────── */
function useMealStatus() {
  return useMemo(() => {
    const now = new Date()
    const h   = now.getHours() + now.getMinutes() / 60
    const order = Object.keys(MEAL_WINDOWS)
    for (const key of order) {
      const [s, e] = MEAL_WINDOWS[key]
      if (h >= s && h < e) return { key, label: 'agora' }
    }
    for (const key of order) {
      if (h < MEAL_WINDOWS[key][0]) return { key, label: 'a seguir' }
    }
    return null
  }, [])
}

/* ── aba: plano semanal ─────────────────────────────────────── */
function PlanTab({ days, dayIdx, setDayIdx }: { days: Day[]; dayIdx: number; setDayIdx: (i: number) => void }) {
  const status = useMealStatus()
  const today  = todayIndex()
  const day    = days[dayIdx]

  return (
    <div>
      <p className="schedule-note">
        Lanche da manhã (10h) · Almoço (12h–13h) · Lanche da tarde (16h) · Jantar (19h–20h). Jantar sempre leve, pelo menos 2h antes de deitar.
      </p>
      <div className="day-nav" role="tablist">
        {days.map((d, i) => (
          <button
            key={d.day}
            role="tab"
            aria-selected={i === dayIdx}
            className={`day-pill${i === dayIdx ? ' active' : ''}`}
            onClick={() => setDayIdx(i)}
          >
            {d.day.slice(0, 3)}
            {i === today && <span className="today-dot" title="hoje" />}
          </button>
        ))}
      </div>
      {day && (
        <div className="meals-grid">
          {Object.keys(MEAL_LABELS).map(key => {
            const meal  = day.meals[key]
            if (!meal) return null
            const isNow = dayIdx === today && status?.key === key
            return (
              <article key={key} className={`meal-card${isNow ? ' now' : ''}`}>
                <div className="meal-head">
                  <span className="meal-label">{MEAL_LABELS[key]}</span>
                  {isNow && <span className="now-pill">{status!.label}</span>}
                </div>
                <h3 className="meal-name">{meal.name}</h3>
                <p className="meal-detail">{meal.detail}</p>
                <div className="tag-row">
                  {(meal.tags ?? []).map(t => (
                    <span key={t} className="tag">
                      <span className="tag-dot" style={{ background: TAG_COLOR[t] ?? 'var(--text-tertiary)' }} />
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── aba: lista de compras ──────────────────────────────────── */
function ShoppingTab({ list }: { list: Record<string, string[]> }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('fa_checks') || '{}') } catch { return {} }
  })

  function toggle(id: string) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem('fa_checks', JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="stack">
      {Object.entries(list).map(([category, items]) => {
        const done = items.filter((_, i) => checked[`${category}/${i}`]).length
        return (
          <section key={category} className="list-card">
            <header className="list-card-head">
              <span>{category}</span>
              <span className="list-count">{done}/{items.length}</span>
            </header>
            {items.map((item, i) => {
              const id   = `${category}/${i}`
              const isOn = !!checked[id]
              return (
                <label key={id} className={`check-row${isOn ? ' done' : ''}`}>
                  <input type="checkbox" checked={isOn} onChange={() => toggle(id)} />
                  <span className="check-box" aria-hidden="true">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6.5 4.8 9.2 10 3.2" />
                    </svg>
                  </span>
                  <span className="check-text">{item}</span>
                </label>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}

/* ── aba: substituições ─────────────────────────────────────── */
function SubsTab({ subs }: { subs: PlanData['substitutions'] }) {
  return (
    <div className="list-card">
      {subs.map((s, i) => {
        const badge = SUB_BADGE[s.status] ?? { color: 'var(--text-tertiary)', label: s.status }
        return (
          <div key={i} className="sub-row">
            <div className="sub-head">
              <span className="status-badge" style={{ color: badge.color }}>
                <span className="tag-dot" style={{ background: badge.color }} />
                {badge.label}
              </span>
              <span className="sub-title">{s.title}</span>
            </div>
            <p className="sub-body">{s.body}</p>
          </div>
        )
      })}
    </div>
  )
}

/* ── aba: dicas esofagite ───────────────────────────────────── */
function TipsTab({ tips }: { tips: PlanData['esophagitis_tips'] }) {
  const sections = [
    { title: 'Gatilhos a evitar',        items: tips.avoid   ?? [], color: 'var(--c-red)'   },
    { title: 'Hábitos que ajudam',        items: tips.habits  ?? [], color: 'var(--c-green)' },
    { title: 'Zero lactose — referência', items: tips.lactose ?? [], color: 'var(--c-blue)'  },
  ]
  return (
    <div className="stack">
      {sections.map(sec => (
        <section key={sec.title} className="list-card">
          <header className="list-card-head">
            <span className="head-with-dot">
              <span className="tag-dot" style={{ background: sec.color }} />
              {sec.title}
            </span>
          </header>
          {sec.items.map((item, i) => (
            <div key={i} className="tip-row">{item}</div>
          ))}
        </section>
      ))}
    </div>
  )
}

/* ── modal: atualizar plano ─────────────────────────────────── */
function UpdateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [json,    setJson]    = useState('')
  const [label,   setLabel]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // fechar com Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit() {
    setError('')
    let parsed: unknown
    try { parsed = JSON.parse(json) } catch {
      setError('JSON inválido. Verifique a formatação.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(parsed as object), label: label.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao salvar.'); return }
      onSuccess()
      onClose()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-root">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Atualizar plano">
        <header className="modal-head">
          <div>
            <h2 className="modal-title">Atualizar plano</h2>
            <p className="modal-sub">Cole o JSON do novo plano gerado</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" />
              <line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        </header>

        <div className="modal-field">
          <label className="field-label" htmlFor="fa-label">
            Nome do plano <span className="muted">(opcional)</span>
          </label>
          <input
            id="fa-label"
            className="field-input"
            type="text"
            placeholder="ex: Semana 25 — jun. de 2026"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </div>

        <div className="modal-field">
          <label className="field-label" htmlFor="fa-json">
            JSON do plano <span className="req">*</span>
          </label>
          <textarea
            id="fa-json"
            className={`field-input mono${error ? ' error' : ''}`}
            rows={10}
            placeholder="Cole o JSON aqui..."
            value={json}
            onChange={e => setJson(e.target.value)}
          />
          {error && <p className="field-error">{error}</p>}
        </div>

        <footer className="modal-foot">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={loading || !json.trim()}>
            {loading && <span className="spinner" />}
            {loading ? 'Salvando...' : 'Salvar plano'}
          </button>
        </footer>
      </div>
    </div>
  )
}

/* ── widget principal ───────────────────────────────────────── */
export default function MealPlanWidget({
  plan,
  onUpdateClick,
  showModal,
  onModalClose,
  onModalSuccess,
}: {
  plan: PlanData
  onUpdateClick: () => void
  showModal: boolean
  onModalClose: () => void
  onModalSuccess: () => void
}) {
  const [tab,    setTab]    = useState('plan')
  const [dayIdx, setDayIdx] = useState(todayIndex)
  const [toast,  setToast]  = useState('')

  const handleSuccess = useCallback(() => {
    onModalSuccess()
    setToast('Plano atualizado')
    setTimeout(() => setToast(''), 2600)
  }, [onModalSuccess])

  return (
    <>
      {/* Cabeçalho da página */}
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Plano alimentar</h1>
          <p className="page-sub">{plan.meta?.label ?? 'Personalizado para esofagite e zero lactose'}</p>
        </div>
        <button className="btn-primary" onClick={onUpdateClick}>
          Atualizar plano
        </button>
      </div>

      {/* Abas */}
      <nav className="tabset" role="tablist" aria-label="Seções">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="tab-body" key={tab}>
        {tab === 'plan'     && <PlanTab days={plan.days} dayIdx={dayIdx} setDayIdx={setDayIdx} />}
        {tab === 'goals'    && <GoalsTab />}
        {tab === 'shopping' && <ShoppingTab list={plan.shopping_list} />}
        {tab === 'subs'     && <SubsTab subs={plan.substitutions} />}
        {tab === 'tips'     && <TipsTab tips={plan.esophagitis_tips} />}
      </div>

      {showModal && (
        <UpdateModal
          onClose={onModalClose}
          onSuccess={handleSuccess}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
