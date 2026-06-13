'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import GoalsTab from '@/components/ui/GoalsTab'

/* ── tipos ─────────────────────────────────────────────────── */
type Meal = { name: string; detail: string; tags: string[] }
type Day  = { day: string; meals: Record<string, Meal> }

type Dressing    = { name: string; ingredients: string; method: string; note: string }
type BatchPhase  = { phase: string; time: string; tasks: string[] }
type WeekdayTip  = { meal: string; time: string; tip: string }
type FreezingItem = { item: string; freeze: boolean; tip: string }
type LegWeek     = { week: string; plan: string; note: string }

export type PlanData = {
  meta?: { id: number; created_at: string; label: string }
  days: Day[]
  shopping_list: Record<string, string[]>
  substitutions: Array<{ status: string; title: string; body: string }>
  esophagitis_tips: { avoid: string[]; habits: string[]; lactose: string[] }
  prep_guide?: {
    intro: string
    dressings: Dressing[]
    batch_sunday: { total_time: string; phases: BatchPhase[] }
    weekday_tips: WeekdayTip[]
    freezing_guide: FreezingItem[]
    legume_rotation: { description: string; weeks: LegWeek[] }
  }
}

/* ── constantes ─────────────────────────────────────────────── */
const TABS = [
  { id: 'plan',     label: 'Plano semanal' },
  { id: 'goals',    label: 'Metas' },
  { id: 'prep',     label: 'Preparação' },
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
        Café da manhã (06h) · Almoço (12h) · Lanche da tarde (17h) · Jantar (19h30). Jantar sempre leve, pelo menos 2h antes de deitar.
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

/* ── aba: preparação ────────────────────────────────────────── */
function PrepTab({ guide }: { guide: NonNullable<PlanData['prep_guide']> }) {
  const [openPhase, setOpenPhase] = useState<number | null>(0)
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('fa_prep_tasks') || '{}') } catch { return {} }
  })

  function toggleTask(id: string) {
    setDoneTasks(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem('fa_prep_tasks', JSON.stringify(next))
      return next
    })
  }

  function resetTasks() {
    setDoneTasks({})
    localStorage.removeItem('fa_prep_tasks')
  }

  return (
    <div className="stack">

      {/* Intro */}
      <div className="list-card" style={{ padding: 'calc(14px * var(--sp)) calc(16px * var(--sp))' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{guide.intro}</p>
      </div>

      {/* Molhos */}
      <section className="list-card" style={{ overflow: 'hidden' }}>
        <header className="list-card-head">
          <span className="head-with-dot">
            <span className="tag-dot" style={{ background: 'var(--c-green)' }} />
            Molhos da semana
          </span>
          <span className="list-count">preparar no domingo</span>
        </header>
        {guide.dressings.map((d, i) => (
          <div key={i} style={{ padding: 'calc(14px * var(--sp)) calc(16px * var(--sp))', borderBottom: i < guide.dressings.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{d.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Ingredientes:</strong> {d.ingredients}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Preparo:</strong> {d.method}
            </div>
            <div style={{ fontSize: 12, color: 'var(--accent-ink)', background: 'var(--accent-subtle)', borderRadius: 8, padding: '5px 10px', marginTop: 6, lineHeight: 1.5 }}>
              {d.note}
            </div>
          </div>
        ))}
      </section>

      {/* Batch cooking domingo */}
      <section className="list-card" style={{ overflow: 'hidden' }}>
        <header className="list-card-head">
          <span className="head-with-dot">
            <span className="tag-dot" style={{ background: 'var(--c-amber)' }} />
            Batch cooking — domingo
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="list-count">{guide.batch_sunday.total_time}</span>
            <button onClick={resetTasks} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 11.5, cursor: 'pointer', fontFamily: 'var(--font-ui)', padding: 0 }}>
              resetar
            </button>
          </div>
        </header>
        {guide.batch_sunday.phases.map((phase, pi) => {
          const isOpen    = openPhase === pi
          const tasksDone = phase.tasks.filter((_, ti) => doneTasks[`${pi}-${ti}`]).length
          const allDone   = tasksDone === phase.tasks.length
          return (
            <div key={pi} style={{ borderBottom: pi < guide.batch_sunday.phases.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <button
                onClick={() => setOpenPhase(isOpen ? null : pi)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'calc(12px * var(--sp)) calc(16px * var(--sp))',
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  gap: 12, textAlign: 'left',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    background: allDone ? 'var(--c-green)' : 'var(--bg-elevated)',
                    border: `1.5px solid ${allDone ? 'var(--c-green)' : 'var(--border-strong)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: allDone ? '#fff' : 'transparent', fontSize: 11,
                  }}>✓</span>
                  <span style={{ fontSize: 13.5, fontWeight: 550, color: 'var(--text-primary)' }}>{phase.phase}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{phase.time}</span>
                  <span style={{ fontSize: 11.5, color: allDone ? 'var(--c-green)' : 'var(--text-tertiary)' }}>{tasksDone}/{phase.tasks.length}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 13, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
                </div>
              </button>
              {isOpen && (
                <div style={{ paddingBottom: 'calc(10px * var(--sp))' }}>
                  {phase.tasks.map((task, ti) => {
                    const id   = `${pi}-${ti}`
                    const done = !!doneTasks[id]
                    return (
                      <label key={ti} className={`check-row${done ? ' done' : ''}`} style={{ paddingLeft: 'calc(46px * var(--sp))' }}>
                        <input type="checkbox" checked={done} onChange={() => toggleTask(id)} />
                        <span className="check-box" aria-hidden="true">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 6.5 4.8 9.2 10 3.2" />
                          </svg>
                        </span>
                        <span className="check-text" style={{ fontSize: 13 }}>{task}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Dicas da semana */}
      <section className="list-card" style={{ overflow: 'hidden' }}>
        <header className="list-card-head">
          <span className="head-with-dot">
            <span className="tag-dot" style={{ background: 'var(--c-blue)' }} />
            Durante a semana
          </span>
        </header>
        {guide.weekday_tips.map((tip, i) => (
          <div key={i} style={{ padding: 'calc(13px * var(--sp)) calc(16px * var(--sp))', borderBottom: i < guide.weekday_tips.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{tip.meal}</span>
              <span className="badge badge-gray" style={{ fontSize: 11 }}>{tip.time}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tip.tip}</p>
          </div>
        ))}
      </section>

      {/* Guia de congelamento */}
      <section className="list-card" style={{ overflow: 'hidden' }}>
        <header className="list-card-head">
          <span className="head-with-dot">
            <span className="tag-dot" style={{ background: 'var(--text-tertiary)' }} />
            O que congelar e o que não congelar
          </span>
        </header>
        {guide.freezing_guide.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 'calc(10px * var(--sp)) calc(16px * var(--sp))', borderBottom: i < guide.freezing_guide.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span style={{
              flexShrink: 0, marginTop: 2, fontSize: 11.5, fontWeight: 600,
              color: item.freeze ? 'var(--c-green)' : 'var(--c-red)',
              background: item.freeze ? 'color-mix(in oklab, var(--c-green) 12%, var(--bg-surface))' : 'color-mix(in oklab, var(--c-red) 12%, var(--bg-surface))',
              border: `1px solid ${item.freeze ? 'color-mix(in oklab, var(--c-green) 30%, var(--border))' : 'color-mix(in oklab, var(--c-red) 30%, var(--border))'}`,
              borderRadius: 999, padding: '2px 8px',
            }}>
              {item.freeze ? 'congela' : 'não congela'}
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{item.item}</div>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{item.tip}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Rodízio de leguminosas */}
      <section className="list-card" style={{ overflow: 'hidden' }}>
        <header className="list-card-head">
          <span className="head-with-dot">
            <span className="tag-dot" style={{ background: 'var(--c-amber)' }} />
            Rodízio de leguminosas
          </span>
        </header>
        <div style={{ padding: 'calc(10px * var(--sp)) calc(16px * var(--sp))', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{guide.legume_rotation.description}</p>
        </div>
        {guide.legume_rotation.weeks.map((w, i) => (
          <div key={i} style={{ padding: 'calc(12px * var(--sp)) calc(16px * var(--sp))', borderBottom: i < guide.legume_rotation.weeks.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span className="badge badge-gray">{w.week}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{w.plan}</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{w.note}</p>
          </div>
        ))}
      </section>

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
          <p className="page-sub">{plan.meta?.label ?? 'Personalizado — Amanda Ferreira Estephan'}</p>
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
        {tab === 'prep'     && (plan.prep_guide
          ? <PrepTab guide={plan.prep_guide} />
          : <div className="goals-empty"><p>Nenhum guia de preparação neste plano.</p><p style={{ fontSize: 12, marginTop: 4 }}>Atualize o plano com um JSON que contenha o campo <code>prep_guide</code>.</p></div>
        )}
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
