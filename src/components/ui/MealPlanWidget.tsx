'use client'
import { useState } from 'react'

type Meal = { name: string; detail: string; tags: string[] }
type Day = {
  day: string
  meals: {
    morning_snack: Meal
    lunch: Meal
    afternoon_snack: Meal
    dinner: Meal
  }
}

type PlanData = {
  days: Day[]
  shopping_list: Record<string, string[]>
  substitutions: Array<{ status: string; title: string; body: string }>
  esophagitis_tips: { avoid: string[]; habits: string[]; lactose: string[] }
}

const TABS = [
  { id: 'plan', label: 'Plano semanal' },
  { id: 'shopping', label: 'Lista de compras' },
  { id: 'subs', label: 'Substituições' },
  { id: 'tips', label: 'Dicas esofagite' },
]

const MEAL_LABELS: Record<string, string> = {
  morning_snack: 'Lanche da manhã',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche da tarde',
  dinner: 'Jantar',
}

const TAG_STYLE: Record<string, string> = {
  'proteína': 'badge-blue',
  'fibra': 'badge-green',
  'esofagite ok': 'badge-yellow',
}

const SUB_BADGE: Record<string, { cls: string; label: string }> = {
  manter:       { cls: 'badge-blue',   label: 'Manter' },
  'não aplica': { cls: 'badge-gray',   label: 'Não se aplica' },
  custo:        { cls: 'badge-red',    label: 'Custo alto' },
  swap:         { cls: 'badge-yellow', label: 'Ativo no plano' },
}

export default function MealPlanWidget({ plan }: { plan: PlanData }) {
  const [tab, setTab] = useState('plan')
  const [dayIdx, setDayIdx] = useState(0)
  const days = plan.days ?? []

  return (
    <div>
      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20,
        borderBottom: '1px solid var(--border)', paddingBottom: 12,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: tab === t.id ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: tab === t.id ? 'var(--accent-subtle)' : 'var(--bg-surface)',
              color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: tab === t.id ? 500 : 400,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all .15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* PLANO SEMANAL */}
      {tab === 'plan' && (
        <div>
          <div style={{
            background: '#1e1e0f',
            border: '1px solid #3a3a10',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: '#c4a83a',
            marginBottom: 16,
            lineHeight: 1.6,
          }}>
            Lanche da manhã (10h) · Almoço (12h–13h) · Lanche da tarde (16h) · Jantar (19h–20h).
            Jantar sempre leve, pelo menos 2h antes de deitar.
          </div>

          {/* Day nav */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {days.map((d, i) => (
              <button
                key={d.day}
                onClick={() => setDayIdx(i)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  border: dayIdx === i ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: dayIdx === i ? 'var(--accent-subtle)' : 'transparent',
                  color: dayIdx === i ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: dayIdx === i ? 500 : 400,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'all .15s',
                }}
              >
                {d.day.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Meals grid */}
          {days[dayIdx] && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 12,
            }}>
              {(Object.keys(MEAL_LABELS) as Array<keyof Day['meals']>).map(key => {
                const meal = days[dayIdx].meals[key]
                if (!meal) return null
                return (
                  <div key={key} className="card" style={{ padding: '14px 16px' }}>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                      color: 'var(--text-tertiary)',
                      marginBottom: 6,
                    }}>
                      {MEAL_LABELS[key]}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, marginBottom: 4 }}>
                      {meal.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
                      {meal.detail}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(meal.tags ?? []).map(tag => (
                        <span key={tag} className={`badge ${TAG_STYLE[tag] ?? 'badge-gray'}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* LISTA DE COMPRAS */}
      {tab === 'shopping' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(plan.shopping_list ?? {}).map(([category, items]) => (
            <div key={category} className="card" style={{ overflow: 'hidden' }}>
              <div style={{
                padding: '8px 14px',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                background: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border)',
                textTransform: 'uppercase',
                letterSpacing: '.04em',
              }}>
                {category}
              </div>
              {(items ?? []).map((item, i) => (
                <div key={i} style={{
                  padding: '9px 14px',
                  fontSize: 13,
                  borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span style={{ color: 'var(--accent)', fontSize: 10 }}>◆</span>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* SUBSTITUIÇÕES */}
      {tab === 'subs' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {(plan.substitutions ?? []).map((s, i) => {
            const badge = SUB_BADGE[s.status] ?? { cls: 'badge-gray', label: s.status }
            return (
              <div key={i} style={{
                padding: '14px 16px',
                borderBottom: i < plan.substitutions.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span className={`badge ${badge.cls}`}>{badge.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{s.title}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.body}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* DICAS ESOFAGITE */}
      {tab === 'tips' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { title: 'Gatilhos a evitar', items: plan.esophagitis_tips?.avoid ?? [], color: '#d45b5b', bg: '#2a1010' },
            { title: 'Hábitos que ajudam', items: plan.esophagitis_tips?.habits ?? [], color: 'var(--accent)', bg: 'var(--accent-subtle)' },
            { title: 'Zero lactose — referência', items: plan.esophagitis_tips?.lactose ?? [], color: '#5ba3d4', bg: '#0d1f2d' },
          ].map(section => (
            <div key={section.title} className="card" style={{ overflow: 'hidden' }}>
              <div style={{
                padding: '8px 14px',
                fontSize: 11,
                fontWeight: 500,
                color: section.color,
                background: section.bg,
                borderBottom: '1px solid var(--border)',
                textTransform: 'uppercase',
                letterSpacing: '.04em',
              }}>
                {section.title}
              </div>
              {section.items.map((item, i) => (
                <div key={i} style={{
                  padding: '9px 14px',
                  fontSize: 13,
                  borderBottom: i < section.items.length - 1 ? '1px solid var(--border)' : 'none',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                }}>
                  <span style={{ color: section.color, fontSize: 10, marginTop: 4, flexShrink: 0 }}>◆</span>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}