'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

/* ── tipos ─────────────────────────────────────────────────── */
export type Goal   = { id: string; name: string }
export type Period = {
  id:         string
  created_at: string
  name:       string
  start_date: string   // YYYY-MM-DD
  end_date:   string   // YYYY-MM-DD
  goals:      Goal[]
  checks:     Record<string, true>
}

/* ── helpers de data (local, sem timezone) ──────────────────── */
function iso(d: Date) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}
function parse(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function addDays(d: Date, n: number) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}
function weekStart(d: Date) { return addDays(d, -((d.getDay() + 6) % 7)) }
function diffDays(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86400000) }
function today() { const t = new Date(); t.setHours(0, 0, 0, 0); return t }
function fmtShort(d: Date) {
  const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + '.'
}
function uid(prefix: string) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
const WEEKDAYS = ['seg','ter','qua','qui','sex','sáb','dom']

/* ── ícones ─────────────────────────────────────────────────── */
function IconX({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6.5 4.8 9.2 10 3.2" />
    </svg>
  )
}
function IconChevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left'
        ? <path d="M9 2.5 4.5 7 9 11.5" />
        : <path d="M5 2.5 9.5 7 5 11.5" />}
    </svg>
  )
}

/* ── texto editável inline ──────────────────────────────────── */
function EditableText({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  if (!editing) {
    return (
      <button type="button" className={`editable ${className ?? ''}`} title="Clique para renomear"
        onClick={() => { setDraft(value); setEditing(true) }}>
        {value}
      </button>
    )
  }
  return (
    <input
      className={`editable-input ${className ?? ''}`}
      value={draft} autoFocus
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); if (draft.trim()) onSave(draft.trim()) }}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      }}
    />
  )
}

/* ── calendar picker customizado ────────────────────────────── */
const MONTHS_LONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
                     'Agosto','Setembro','Outubro','Novembro','Dezembro']

function CalendarPicker({ value, onChange, ariaLabel }: {
  value: string; onChange: (v: string) => void; ariaLabel: string
}) {
  const selected  = value ? parse(value) : null
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const d = value ? parse(value) : today()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const wrapRef = useRef<HTMLDivElement>(null)

  // fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // fecha com Esc
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // re-centraliza o mês ao valor mudar externamente (ex: início arrasta fim)
  useEffect(() => {
    if (value) setView(new Date(parse(value).getFullYear(), parse(value).getMonth(), 1))
  }, [value])

  function selectDay(d: Date) { onChange(iso(d)); setOpen(false) }

  // constrói a grade: offset de segunda-feira + dias do mês + preenchimento final
  const firstDay    = new Date(view.getFullYear(), view.getMonth(), 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells: Array<{ date: Date; outside: boolean }> = []
  for (let i = 0; i < startOffset; i++)
    cells.push({ date: addDays(firstDay, i - startOffset), outside: true })
  for (let i = 1; i <= daysInMonth; i++)
    cells.push({ date: new Date(view.getFullYear(), view.getMonth(), i), outside: false })
  while (cells.length % 7 !== 0)
    cells.push({ date: addDays(cells[cells.length - 1].date, 1), outside: true })

  const tod    = today()
  const display = selected
    ? `${String(selected.getDate()).padStart(2,'0')}/${String(selected.getMonth()+1).padStart(2,'0')}/${selected.getFullYear()}`
    : ''

  return (
    <div className="dp-wrap" ref={wrapRef}>
      <button type="button" className="date-input dp-trigger"
        aria-label={ariaLabel} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen(o => !o)}>
        {display || <span className="dp-placeholder">DD/MM/AAAA</span>}
      </button>

      {open && (
        <div className="dp-popup" role="dialog" aria-label={`Calendário: ${ariaLabel}`}>
          <div className="dp-nav">
            <button type="button" className="icon-btn dp-arrow" aria-label="Mês anterior"
              onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() - 1, 1))}>
              <IconChevron dir="left" />
            </button>
            <span className="dp-month-label">
              {MONTHS_LONG[view.getMonth()]} {view.getFullYear()}
            </span>
            <button type="button" className="icon-btn dp-arrow" aria-label="Próximo mês"
              onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() + 1, 1))}>
              <IconChevron dir="right" />
            </button>
          </div>

          <div className="dp-grid">
            {['seg','ter','qua','qui','sex','sáb','dom'].map(d => (
              <span key={d} className="dp-wday">{d}</span>
            ))}
            {cells.map(({ date, outside }, i) => {
              const isSelected = !!selected && iso(date) === iso(selected)
              const isToday    = iso(date) === iso(tod)
              return (
                <button key={i} type="button"
                  className={['dp-day', outside ? 'dp-outside' : '', isSelected ? 'dp-selected' : '', isToday && !isSelected ? 'dp-today' : ''].filter(Boolean).join(' ')}
                  aria-label={`${date.getDate()} de ${MONTHS_LONG[date.getMonth()]} de ${date.getFullYear()}${isSelected ? ' (selecionado)' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => selectDay(date)}>
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── botão de remoção em duas etapas ───────────────────────── */
function ConfirmButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!armed) return
    timerRef.current = setTimeout(() => setArmed(false), 3200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [armed])
  return (
    <button type="button" className={`danger-btn${armed ? ' armed' : ''}`}
      onClick={() => { if (armed) onConfirm(); else setArmed(true) }}>
      {armed ? confirmLabel : label}
    </button>
  )
}

/* ── card de um período ─────────────────────────────────────── */
function PeriodCard({
  period,
  onChange,
  onRemove,
}: {
  period: Period
  onChange: (updater: (p: Period) => Period) => void
  onRemove: () => void
}) {
  const tod       = today()
  const start     = parse(period.start_date)
  const end       = parse(period.end_date)
  const firstWeek = weekStart(start)
  const lastWeek  = weekStart(end)

  const clampWeek = useCallback((ws: Date) => {
    if (ws < firstWeek) return firstWeek
    if (ws > lastWeek)  return lastWeek
    return ws
  }, [firstWeek, lastWeek])

  const [ws, setWs] = useState(() => clampWeek(weekStart(tod)))

  // re-ancora semana quando as datas do período mudam
  useEffect(() => { setWs(w => clampWeek(w)) }, [period.start_date, period.end_date, clampWeek])

  const [addingGoal, setAddingGoal] = useState(false)
  const [goalDraft,  setGoalDraft]  = useState('')

  const days      = [0,1,2,3,4,5,6].map(i => addDays(ws, i))
  const canPrev   = ws > firstWeek
  const canNext   = ws < lastWeek
  const weekIdx   = Math.round(diffDays(firstWeek, ws) / 7) + 1
  const weekCount = Math.round(diffDays(firstWeek, lastWeek) / 7) + 1

  const totalDays = diffDays(start, end) + 1
  const elapsed   = tod < start ? 0 : diffDays(start, tod > end ? end : tod) + 1

  function countChecks(goalId: string) {
    let n = 0
    for (let i = 0; i < elapsed; i++) {
      if (period.checks[goalId + '/' + iso(addDays(start, i))]) n++
    }
    return n
  }

  const totalChecked = period.goals.reduce((acc, g) => acc + countChecks(g.id), 0)
  const possible     = elapsed * period.goals.length
  const pct          = possible > 0 ? Math.round((totalChecked / possible) * 100) : null

  function setStartDate(v: string) {
    if (!v) return
    onChange(p => ({ ...p, start_date: v, end_date: parse(v) > parse(p.end_date) ? v : p.end_date }))
  }
  function setEndDate(v: string) {
    if (!v) return
    onChange(p => ({ ...p, end_date: v, start_date: parse(v) < parse(p.start_date) ? v : p.start_date }))
  }
  function toggle(goalId: string, dateIso: string) {
    onChange(p => {
      const key    = goalId + '/' + dateIso
      const checks = { ...p.checks }
      if (checks[key]) delete checks[key]; else checks[key] = true
      return { ...p, checks }
    })
  }
  function renameGoal(goalId: string, name: string) {
    onChange(p => ({ ...p, goals: p.goals.map(g => g.id === goalId ? { ...g, name } : g) }))
  }
  function removeGoal(goalId: string) {
    onChange(p => ({ ...p, goals: p.goals.filter(g => g.id !== goalId) }))
  }
  function saveNewGoal() {
    const name = goalDraft.trim()
    setAddingGoal(false); setGoalDraft('')
    if (!name) return
    onChange(p => ({ ...p, goals: [...p.goals, { id: uid('g'), name }] }))
  }

  return (
    <section className="period-card">
      <header className="period-head">
        <div className="period-id">
          <EditableText className="period-name" value={period.name}
            onSave={v => onChange(p => ({ ...p, name: v }))} />
          <div className="period-dates">
            <CalendarPicker value={period.start_date} ariaLabel="Data de início" onChange={setStartDate} />
            <span className="date-sep">→</span>
            <CalendarPicker value={period.end_date} ariaLabel="Data de término" onChange={setEndDate} />
            <span className="period-meta">{totalDays} dias</span>
          </div>
        </div>
        <div className="period-actions">
          {pct !== null && <span className="period-pct">{pct}% até hoje</span>}
          <ConfirmButton label="Remover" confirmLabel="Confirmar remoção" onConfirm={onRemove} />
        </div>
      </header>

      <div className="week-nav">
        <button type="button" className="icon-btn week-arrow" disabled={!canPrev}
          aria-label="Semana anterior" onClick={() => setWs(addDays(ws, -7))}>
          <IconChevron dir="left" />
        </button>
        <span className="week-label">
          {fmtShort(days[0])} – {fmtShort(days[6])}
          <span className="week-sub"> · semana {weekIdx} de {weekCount}</span>
        </span>
        <button type="button" className="icon-btn week-arrow" disabled={!canNext}
          aria-label="Próxima semana" onClick={() => setWs(addDays(ws, 7))}>
          <IconChevron dir="right" />
        </button>
      </div>

      <div className="goal-table">
        {/* cabeçalho */}
        <div className="goal-row goal-head-row">
          <span className="goal-name-cell goal-col-label">Meta</span>
          <div className="goal-dots">
            {days.map(d => {
              const inRange = d >= start && d <= end
              const isToday = diffDays(d, tod) === 0
              return (
                <span key={iso(d)} className={`dot-head${isToday ? ' today' : ''}${inRange ? '' : ' off'}`}>
                  {WEEKDAYS[(d.getDay() + 6) % 7]}
                  <b>{d.getDate()}</b>
                </span>
              )
            })}
          </div>
          <span className="goal-count goal-col-label" />
        </div>

        {/* linhas de metas */}
        {period.goals.map(g => (
          <div key={g.id} className="goal-row">
            <div className="goal-name-cell">
              <EditableText className="goal-name" value={g.name}
                onSave={v => renameGoal(g.id, v)} />
              <button type="button" className="goal-remove"
                aria-label={`Remover meta ${g.name}`}
                onClick={() => removeGoal(g.id)}>
                <IconX />
              </button>
            </div>
            <div className="goal-dots">
              {days.map(d => {
                const dateIso = iso(d)
                const inRange = d >= start && d <= end
                if (!inRange) return <span key={dateIso} className="day-dot off" />
                const future  = d > tod
                const checked = !!period.checks[g.id + '/' + dateIso]
                return (
                  <button key={dateIso} type="button"
                    className={`day-dot${checked ? ' checked' : ''}${future ? ' future' : ''}`}
                    disabled={future}
                    aria-label={`${g.name} — ${fmtShort(d)}${checked ? ' (cumprida)' : ''}`}
                    aria-pressed={checked}
                    onClick={() => toggle(g.id, dateIso)}>
                    {checked && <IconCheck />}
                  </button>
                )
              })}
            </div>
            <span className="goal-count">{countChecks(g.id)}/{elapsed}</span>
          </div>
        ))}

        {period.goals.length === 0 && !addingGoal && (
          <p className="goal-empty">Nenhuma meta neste período ainda.</p>
        )}

        {/* adicionar meta */}
        <div className="goal-add-row">
          {addingGoal
            ? <input className="field-input goal-add-input" autoFocus
                placeholder="ex: Ingestão hídrica"
                value={goalDraft}
                onChange={e => setGoalDraft(e.target.value)}
                onBlur={saveNewGoal}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveNewGoal()
                  if (e.key === 'Escape') { setGoalDraft(''); setAddingGoal(false) }
                }} />
            : <button type="button" className="add-btn"
                onClick={() => { setAddingGoal(true); setGoalDraft('') }}>
                + Adicionar meta
              </button>}
        </div>
      </div>
    </section>
  )
}

/* ── aba Metas ──────────────────────────────────────────────── */
export default function GoalsTab() {
  const [periods,  setPeriods]  = useState<Period[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  // fila de patches pendentes por id (evita race conditions)
  const patchQueue = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  /* carrega do servidor */
  useEffect(() => {
    fetch('/api/goals')
      .then(r => r.json())
      .then((data: Period[]) => { setPeriods(data); setLoading(false) })
      .catch(() => { setError('Erro ao carregar metas.'); setLoading(false) })
  }, [])

  /* persiste no servidor com debounce (400ms) para não disparar a cada clique */
  const schedulePatch = useCallback((period: Period) => {
    if (patchQueue.current[period.id]) clearTimeout(patchQueue.current[period.id])
    patchQueue.current[period.id] = setTimeout(async () => {
      delete patchQueue.current[period.id]
      const res = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:         period.id,
          name:       period.name,
          start_date: period.start_date,
          end_date:   period.end_date,
          goals:      period.goals,
          checks:     period.checks,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        console.error('Falha ao salvar metas:', d.error)
      }
    }, 400)
  }, [])

  function updatePeriod(id: string, updater: (p: Period) => Period) {
    setPeriods(ps => {
      const next = ps.map(p => p.id === id ? updater(p) : p)
      const updated = next.find(p => p.id === id)
      if (updated) schedulePatch(updated)
      return next
    })
  }

  async function addPeriod() {
    const n = periods.length + 1
    const start = today()
    const body = {
      name:       `Período ${n}`,
      start_date: iso(start),
      end_date:   iso(addDays(start, 27)),
      goals:      [],
      checks:     {},
    }
    const res  = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) setPeriods(ps => [...ps, data as Period])
    else console.error('Falha ao criar período:', data.error)
  }

  async function removePeriod(id: string) {
    // optimistic
    setPeriods(ps => ps.filter(p => p.id !== id))
    const res = await fetch('/api/goals', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      console.error('Falha ao remover período:', d.error)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'var(--border-strong)', borderTopColor: 'var(--accent)' }} />
      Carregando metas...
    </div>
  )

  if (error) return (
    <div style={{ background: 'color-mix(in oklab, var(--c-red) 10%, var(--bg-surface))', border: '1px solid color-mix(in oklab, var(--c-red) 30%, var(--border))', borderRadius: 10, padding: '13px 16px', color: 'var(--c-red)', fontSize: 13, marginTop: 24 }}>
      {error}
    </div>
  )

  return (
    <div>
      <div className="goals-top">
        <p className="schedule-note goals-note">
          Toque no círculo do dia para marcar a meta como cumprida. A contagem considera os dias do período já decorridos.
        </p>
        <button type="button" className="btn-ghost add-period-btn" onClick={addPeriod}>
          + Novo período
        </button>
      </div>

      {periods.length === 0
        ? (
          <div className="goals-empty">
            <p>Nenhum período de metas.</p>
            <button type="button" className="btn-primary" onClick={addPeriod}>Criar período</button>
          </div>
        )
        : (
          <div className="stack">
            {periods.map(p => (
              <PeriodCard
                key={p.id}
                period={p}
                onChange={updater => updatePeriod(p.id, updater)}
                onRemove={() => removePeriod(p.id)}
              />
            ))}
          </div>
        )
      }
    </div>
  )
}
