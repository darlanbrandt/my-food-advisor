'use client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import CalendarPicker from '@/components/ui/CalendarPicker'
import {
  type WeightEntry,
  currentAverage, totalVariation, weeklyRate, goalDistance,
  sustainedRapidLoss, movingAverageSeries, sortByDate,
  formatDateBR, todayInSaoPaulo, parseWeightInput, isWeightInRange,
  MIN_WEIGHT, MAX_WEIGHT,
} from '@/lib/weight-calculations'

/* ── helpers de formatação (padrão brasileiro, vírgula decimal) ─ */
// Formata um número em kg com casas decimais e vírgula
function fmtKg(n: number, dec = 1): string {
  return n.toFixed(dec).replace('.', ',')
}
// Formata com sinal explícito (− tipográfico para negativos)
function fmtSigned(n: number, dec = 1): string {
  return (n < 0 ? '−' : '+') + Math.abs(n).toFixed(dec).replace('.', ',')
}
// Número do dia (contagem em dias UTC) — usado para posicionar no eixo X
const DAY_MS = 86400000
function isoToDayNum(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

/* ── ícones ─────────────────────────────────────────────────── */
// Seta de tendência (cima/baixo) para variação e ritmo
function IconTrend({ dir }: { dir: 'up' | 'down' }) {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'up'
        ? <path d="M3 8 6 4 9 8" />
        : <path d="M3 4 6 8 9 4" />}
    </svg>
  )
}
// Ícone de lápis (editar)
function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2.5 11.5 4.5 5 11 2.5 11.5 3 9z" />
    </svg>
  )
}

/* ── card de indicador ──────────────────────────────────────── */
// Card genérico dos indicadores do topo. `tone` colore o valor.
function StatCard({ label, value, sub, tone, icon }: {
  label: string
  value: string
  sub?: string
  tone?: 'green' | 'red' | 'neutral'
  icon?: React.ReactNode
}) {
  const color = tone === 'green' ? 'var(--c-green)' : tone === 'red' ? 'var(--c-red)' : 'var(--text-primary)'
  return (
    <div className="wt-stat">
      <span className="wt-stat-label">{label}</span>
      <span className="wt-stat-value" style={{ color }}>
        {icon}{value}
      </span>
      {sub && <span className="wt-stat-sub">{sub}</span>}
    </div>
  )
}

/* ── gráfico SVG (pontos diários + média móvel + linha da meta) ─ */
function WeightChart({ entriesAsc, goal, maByDate }: {
  entriesAsc: WeightEntry[]
  goal: number | null
  maByDate: Map<string, number>
}) {
  // filtro de período: 30, 90 dias ou tudo (0)
  const [period, setPeriod] = useState<30 | 90 | 0>(30)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  // aplica o filtro de período em relação ao último registro
  const shown = useMemo(() => {
    if (!entriesAsc.length || period === 0) return entriesAsc
    const latestDay = isoToDayNum(entriesAsc[entriesAsc.length - 1].entry_date)
    const cutoff = latestDay - (period - 1)
    return entriesAsc.filter(e => isoToDayNum(e.entry_date) >= cutoff)
  }, [entriesAsc, period])

  // geometria do gráfico (coordenadas em unidades de viewBox)
  const W = 720, H = 260
  const P = { l: 44, r: 16, t: 16, b: 28 }
  const plotW = W - P.l - P.r
  const plotH = H - P.t - P.b

  // domínios de X (dias) e Y (peso), calculados a partir do que será exibido
  const geom = useMemo(() => {
    const days = shown.map(e => isoToDayNum(e.entry_date))
    const minDay = Math.min(...days), maxDay = Math.max(...days)
    const pool: number[] = []
    shown.forEach(e => { pool.push(e.weight_kg); const a = maByDate.get(e.entry_date); if (a != null) pool.push(a) })
    if (goal != null) pool.push(goal)
    let minW = Math.min(...pool), maxW = Math.max(...pool)
    if (minW === maxW) { minW -= 1; maxW += 1 }         // evita divisão por zero
    const padY = Math.max(0.4, (maxW - minW) * 0.15)     // respiro vertical
    minW -= padY; maxW += padY
    return { minDay, maxDay, minW, maxW }
  }, [shown, goal, maByDate])

  // mapeia data → X e peso → Y
  const xFor = useCallback((iso: string) => {
    const { minDay, maxDay } = geom
    if (maxDay === minDay) return P.l + plotW / 2
    return P.l + ((isoToDayNum(iso) - minDay) / (maxDay - minDay)) * plotW
  }, [geom, P.l, plotW])
  const yFor = useCallback((w: number) => {
    const { minW, maxW } = geom
    return P.t + (1 - (w - minW) / (maxW - minW)) * plotH
  }, [geom, P.t, plotH])

  // rastreia o ponto mais próximo do cursor/toque
  function handleMove(e: React.PointerEvent) {
    if (!wrapRef.current || !shown.length) return
    const rect = wrapRef.current.getBoundingClientRect()
    const vbX = ((e.clientX - rect.left) / rect.width) * W
    let best = 0, bestDist = Infinity
    shown.forEach((en, i) => {
      const dx = Math.abs(xFor(en.entry_date) - vbX)
      if (dx < bestDist) { bestDist = dx; best = i }
    })
    setHoverIdx(best)
  }

  if (shown.length === 0) return null

  // pré-computa as linhas
  const maLine = shown
    .map(e => { const a = maByDate.get(e.entry_date); return a == null ? null : `${xFor(e.entry_date).toFixed(1)},${yFor(a).toFixed(1)}` })
    .filter(Boolean)
    .join(' ')

  // ticks do eixo Y (3 níveis) e do eixo X (início, meio, fim)
  const yTicks = [geom.maxW, (geom.minW + geom.maxW) / 2, geom.minW]
  const xTickEntries = shown.length === 1
    ? [shown[0]]
    : [shown[0], shown[Math.floor((shown.length - 1) / 2)], shown[shown.length - 1]]

  const hovered = hoverIdx != null ? shown[hoverIdx] : null
  const hoveredMA = hovered ? maByDate.get(hovered.entry_date) ?? null : null

  return (
    <section className="list-card wt-chart-card">
      <header className="list-card-head">
        <span className="head-with-dot">
          <span className="tag-dot" style={{ background: 'var(--accent)' }} />
          Evolução
        </span>
        <div className="wt-period" role="tablist" aria-label="Período">
          {([[30, '30 dias'], [90, '90 dias'], [0, 'Tudo']] as const).map(([p, label]) => (
            <button key={p} type="button" role="tab" aria-selected={period === p}
              className={`wt-period-btn${period === p ? ' active' : ''}`}
              onClick={() => { setPeriod(p); setHoverIdx(null) }}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="wt-chart">
        <div className="wt-chart-plot" ref={wrapRef}>
        <svg viewBox={`0 0 ${W} ${H}`} className="wt-chart-svg" role="img"
          aria-label="Gráfico da evolução do peso"
          onPointerMove={handleMove} onPointerLeave={() => setHoverIdx(null)}>
          {/* grade e rótulos do eixo Y */}
          {yTicks.map((w, i) => (
            <g key={i}>
              <line x1={P.l} y1={yFor(w)} x2={W - P.r} y2={yFor(w)} stroke="var(--border)" strokeWidth="1" />
              <text x={P.l - 8} y={yFor(w) + 3} textAnchor="end" className="wt-axis-text">{fmtKg(w)}</text>
            </g>
          ))}

          {/* rótulos do eixo X */}
          {xTickEntries.map((e, i) => (
            <text key={i} x={xFor(e.entry_date)} y={H - 8}
              textAnchor={i === 0 ? 'start' : i === xTickEntries.length - 1 ? 'end' : 'middle'}
              className="wt-axis-text">
              {formatDateBR(e.entry_date).slice(0, 5)}
            </text>
          ))}

          {/* linha tracejada da meta */}
          {goal != null && (
            <g>
              <line x1={P.l} y1={yFor(goal)} x2={W - P.r} y2={yFor(goal)}
                stroke="var(--c-green)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.9" />
              <text x={W - P.r} y={yFor(goal) - 5} textAnchor="end" className="wt-axis-text" fill="var(--c-green)">
                meta {fmtKg(goal)}
              </text>
            </g>
          )}

          {/* linha da média móvel */}
          {maLine && (
            <polyline points={maLine} fill="none" stroke="var(--accent)" strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round" />
          )}

          {/* pontos diários (peso bruto) */}
          {shown.map((e, i) => (
            <circle key={e.id} cx={xFor(e.entry_date)} cy={yFor(e.weight_kg)}
              r={hoverIdx === i ? 4 : 2.6}
              fill={hoverIdx === i ? 'var(--accent)' : 'var(--text-tertiary)'} />
          ))}

          {/* guia vertical do ponto em foco */}
          {hovered && (
            <line x1={xFor(hovered.entry_date)} y1={P.t} x2={xFor(hovered.entry_date)} y2={H - P.b}
              stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 3" />
          )}
        </svg>

        {/* tooltip posicionado sobre o ponto em foco */}
        {hovered && (
          <div className="wt-tooltip" style={{ left: `${(xFor(hovered.entry_date) / W) * 100}%` }}>
            <div className="wt-tooltip-date">{formatDateBR(hovered.entry_date)}</div>
            <div className="wt-tooltip-row"><span>Dia</span><b>{fmtKg(hovered.weight_kg)} kg</b></div>
            {hoveredMA != null && (
              <div className="wt-tooltip-row"><span>Média 7d</span><b>{fmtKg(hoveredMA)} kg</b></div>
            )}
            {hovered.note && <div className="wt-tooltip-note">{hovered.note}</div>}
          </div>
        )}
        </div>
      </div>
    </section>
  )
}

/* ── linha do histórico ─────────────────────────────────────── */
// Um registro na lista: data, peso, diferença para o registro anterior,
// observação e ações de editar/excluir.
function HistoryRow({ entry, prev, onEdit, onDelete }: {
  entry: WeightEntry
  prev: WeightEntry | null       // registro cronologicamente anterior
  onEdit: (id: string, weight_kg: number, note: string | null) => Promise<string | null>
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [weightDraft, setWeightDraft] = useState(fmtKg(entry.weight_kg))
  const [noteDraft, setNoteDraft] = useState(entry.note ?? '')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [armed, setArmed] = useState(false)   // confirmação de exclusão em 2 etapas

  // diferença em relação ao registro anterior (peso bruto)
  const delta = prev ? entry.weight_kg - prev.weight_kg : null

  async function save() {
    const parsed = parseWeightInput(weightDraft)
    if (parsed == null || !isWeightInRange(parsed)) {
      setErr(`Peso entre ${MIN_WEIGHT} e ${MAX_WEIGHT} kg.`)
      return
    }
    setSaving(true); setErr('')
    const error = await onEdit(entry.id, parsed, noteDraft.trim() || null)
    setSaving(false)
    if (error) { setErr(error); return }
    setEditing(false)
  }

  // modo edição inline
  if (editing) {
    return (
      <div className="wt-hist-row wt-hist-editing">
        <div className="wt-hist-edit-fields">
          <input className={`field-input wt-edit-weight${err ? ' error' : ''}`} inputMode="decimal"
            value={weightDraft} autoFocus aria-label="Peso"
            onChange={e => setWeightDraft(e.target.value)} />
          <input className="field-input wt-edit-note" type="text" placeholder="Observação (opcional)"
            value={noteDraft} aria-label="Observação"
            onChange={e => setNoteDraft(e.target.value)} />
        </div>
        <div className="wt-hist-edit-actions">
          <button className="btn-ghost wt-sm-btn" onClick={() => { setEditing(false); setErr('') }} disabled={saving}>Cancelar</button>
          <button className="btn-primary wt-sm-btn" onClick={save} disabled={saving}>
            {saving && <span className="spinner" />}Salvar
          </button>
        </div>
        {err && <p className="field-error wt-edit-err">{err}</p>}
      </div>
    )
  }

  return (
    <div className="wt-hist-row">
      <div className="wt-hist-main">
        <span className="wt-hist-date">{formatDateBR(entry.entry_date)}</span>
        <span className="wt-hist-weight">{fmtKg(entry.weight_kg)} kg</span>
        {delta != null && delta !== 0 && (
          <span className="wt-delta" style={{ color: delta < 0 ? 'var(--c-green)' : 'var(--c-red)' }}>
            <IconTrend dir={delta < 0 ? 'down' : 'up'} />{fmtSigned(delta)}
          </span>
        )}
      </div>
      {entry.note && <p className="wt-hist-note">{entry.note}</p>}
      <div className="wt-hist-actions">
        <button className="icon-btn wt-hist-btn" aria-label="Editar registro" title="Editar"
          onClick={() => { setWeightDraft(fmtKg(entry.weight_kg)); setNoteDraft(entry.note ?? ''); setEditing(true) }}>
          <IconEdit />
        </button>
        <button type="button" className={`danger-btn wt-hist-del${armed ? ' armed' : ''}`}
          onClick={() => { if (armed) onDelete(entry.id); else setArmed(true) }}
          onBlur={() => setArmed(false)}>
          {armed ? 'Confirmar' : 'Excluir'}
        </button>
      </div>
    </div>
  )
}

/* ── editor do peso-meta ────────────────────────────────────── */
function GoalEditor({ goal, onSave }: { goal: number | null; onSave: (v: number) => Promise<string | null> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(goal != null ? fmtKg(goal) : '')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const parsed = parseWeightInput(draft)
    if (parsed == null || !isWeightInRange(parsed)) {
      setErr(`Meta entre ${MIN_WEIGHT} e ${MAX_WEIGHT} kg.`)
      return
    }
    setSaving(true); setErr('')
    const error = await onSave(parsed)
    setSaving(false)
    if (error) { setErr(error); return }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="wt-goal">
        <span className="wt-goal-label">Meta</span>
        <input className={`field-input wt-goal-input${err ? ' error' : ''}`} inputMode="decimal"
          value={draft} autoFocus aria-label="Peso-meta"
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }} />
        <button className="btn-primary wt-sm-btn" onClick={save} disabled={saving}>
          {saving && <span className="spinner" />}Salvar
        </button>
        <button className="btn-ghost wt-sm-btn" onClick={() => { setEditing(false); setErr('') }} disabled={saving}>Cancelar</button>
        {err && <span className="field-error">{err}</span>}
      </div>
    )
  }

  return (
    <div className="wt-goal">
      <span className="wt-goal-label">Meta</span>
      <span className="wt-goal-value">{goal != null ? `${fmtKg(goal)} kg` : 'não definida'}</span>
      <button type="button" className="add-btn" onClick={() => { setDraft(goal != null ? fmtKg(goal) : ''); setEditing(true) }}>
        {goal != null ? 'editar' : 'definir'}
      </button>
    </div>
  )
}

/* ── aba Peso (componente principal) ────────────────────────── */
export default function WeightTab() {
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [goal, setGoal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // estado do formulário de registro
  const [formDate, setFormDate] = useState(todayInSaoPaulo())
  const [formWeight, setFormWeight] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formErr, setFormErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)   // já existe registro na data

  const [visibleCount, setVisibleCount] = useState(30)          // paginação "carregar mais"

  // exibe um toast temporário
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }, [])

  // carrega registros e meta do servidor
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/weight')
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Não foi possível carregar os dados.'); return }
      setEntries(data.entries as WeightEntry[])
      setGoal(data.settings?.goal_weight_kg ?? null)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /* ── derivados (memoizados) ─────────────────────────────────── */
  const entriesAsc  = useMemo(() => sortByDate(entries), [entries])
  const entriesDesc = useMemo(() => [...entriesAsc].reverse(), [entriesAsc])
  const maByDate    = useMemo(() => {
    const map = new Map<string, number>()
    movingAverageSeries(entries).forEach(p => map.set(p.entry_date, p.avg))
    return map
  }, [entries])

  const stats = useMemo(() => ({
    current:  currentAverage(entries),
    variation: totalVariation(entries),
    rate:     weeklyRate(entries),
    distance: goalDistance(entries, goal),
    rapidLoss: sustainedRapidLoss(entries),
  }), [entries, goal])

  const latestEntry = entriesDesc[0] ?? null
  const existingForDate = useMemo(
    () => entries.find(e => e.entry_date === formDate) ?? null,
    [entries, formDate],
  )

  /* ── ações de escrita ───────────────────────────────────────── */
  // aplica um registro retornado pelo servidor ao estado local
  function upsertLocal(saved: WeightEntry) {
    setEntries(prev => {
      const rest = prev.filter(e => e.id !== saved.id && e.entry_date !== saved.entry_date)
      return [...rest, saved]
    })
  }

  // salva (cria ou substitui) o registro do formulário
  async function submitForm() {
    const parsed = parseWeightInput(formWeight)
    if (parsed == null || !isWeightInRange(parsed)) {
      setFormErr(`Informe um peso entre ${MIN_WEIGHT} e ${MAX_WEIGHT} kg.`)
      return
    }
    if (formDate > todayInSaoPaulo()) {
      setFormErr('A data não pode ser futura.')
      return
    }
    // se já existe registro na data e ainda não confirmou, pede confirmação
    if (existingForDate && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    setSaving(true); setFormErr('')
    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_date: formDate, weight_kg: parsed, note: formNote.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) { setFormErr(data.error ?? 'Erro ao salvar.'); return }
      upsertLocal(data as WeightEntry)
      setFormWeight(''); setFormNote(''); setConfirmReplace(false)
      showToast(existingForDate ? 'Registro substituído' : 'Peso registrado')
    } catch {
      setFormErr('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  // edita um registro existente (peso/observação)
  async function editEntry(id: string, weight_kg: number, note: string | null): Promise<string | null> {
    try {
      const res = await fetch('/api/weight', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, weight_kg, note }),
      })
      const data = await res.json()
      if (!res.ok) return data.error ?? 'Erro ao salvar.'
      upsertLocal(data as WeightEntry)
      showToast('Registro atualizado')
      return null
    } catch {
      return 'Erro de conexão.'
    }
  }

  // exclui um registro (otimista)
  async function deleteEntry(id: string) {
    const backup = entries
    setEntries(prev => prev.filter(e => e.id !== id))
    const res = await fetch('/api/weight', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { setEntries(backup); showToast('Falha ao excluir') }
    else showToast('Registro excluído')
  }

  // salva o peso-meta
  async function saveGoal(value: number): Promise<string | null> {
    try {
      const res = await fetch('/api/weight', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_weight_kg: value }),
      })
      const data = await res.json()
      if (!res.ok) return data.error ?? 'Erro ao salvar.'
      setGoal(data.goal_weight_kg ?? null)
      showToast('Meta atualizada')
      return null
    } catch {
      return 'Erro de conexão.'
    }
  }

  /* ── estados de carga / erro ────────────────────────────────── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'var(--border-strong)', borderTopColor: 'var(--accent)' }} />
      Carregando registros...
    </div>
  )

  if (error) return (
    <div style={{ background: 'color-mix(in oklab, var(--c-red) 10%, var(--bg-surface))', border: '1px solid color-mix(in oklab, var(--c-red) 30%, var(--border))', borderRadius: 10, padding: '13px 16px', color: 'var(--c-red)', fontSize: 13, display: 'flex', gap: 12, alignItems: 'center', marginTop: 24 }}>
      {error}
      <button onClick={load} style={{ background: 'none', border: 'none', color: 'var(--c-red)', cursor: 'pointer', textDecoration: 'underline', fontSize: 13, fontFamily: 'var(--font-ui)', marginLeft: 'auto' }}>
        Tentar novamente
      </button>
    </div>
  )

  return (
    <div className="stack">
      {/* Formulário de registro — no topo (uso principal: registrar de manhã) */}
      <section className="list-card wt-form">
        <header className="list-card-head">
          <span className="head-with-dot">
            <span className="tag-dot" style={{ background: 'var(--accent)' }} />
            Registrar peso
          </span>
        </header>
        <div className="wt-form-body">
          <div className="wt-form-row">
            <div className="wt-field">
              <label className="field-label">Data</label>
              <CalendarPicker value={formDate} onChange={v => { setFormDate(v); setConfirmReplace(false); setFormErr('') }} ariaLabel="Data do registro" maxDate={todayInSaoPaulo()} />
            </div>
            <div className="wt-field">
              <label className="field-label" htmlFor="wt-weight">Peso (kg)</label>
              <input id="wt-weight" className={`field-input${formErr ? ' error' : ''}`} inputMode="decimal"
                placeholder="ex: 74,8" value={formWeight}
                onChange={e => { setFormWeight(e.target.value); setConfirmReplace(false) }}
                onKeyDown={e => { if (e.key === 'Enter') submitForm() }} />
            </div>
          </div>
          <div className="wt-field">
            <label className="field-label" htmlFor="wt-note">Observação <span className="muted">(opcional)</span></label>
            <input id="wt-note" className="field-input" type="text" placeholder="ex: após viagem, dia de refeição livre"
              value={formNote} onChange={e => setFormNote(e.target.value)} />
          </div>

          {formErr && <p className="field-error">{formErr}</p>}

          {/* aviso de substituição quando já existe registro na data */}
          {confirmReplace && existingForDate && (
            <div className="wt-replace-warn">
              Já existe registro em {formatDateBR(formDate)} ({fmtKg(existingForDate.weight_kg)} kg). Substituir?
            </div>
          )}

          <div className="wt-form-actions">
            {confirmReplace && (
              <button className="btn-ghost" onClick={() => setConfirmReplace(false)} disabled={saving}>Cancelar</button>
            )}
            <button className="btn-primary" onClick={submitForm} disabled={saving || !formWeight.trim()}>
              {saving && <span className="spinner" />}
              {confirmReplace ? 'Substituir' : 'Salvar'}
            </button>
          </div>
        </div>
      </section>

      {/* Alerta de ritmo acelerado (discreto) */}
      {stats.rapidLoss && (
        <div className="wt-alert" role="status">
          <span className="wt-alert-dot" />
          <span><b>Ritmo acelerado:</b> risco de perder massa magra. A perda passou de 0,5 kg/semana por duas semanas seguidas.</span>
        </div>
      )}

      {/* Indicadores */}
      <div className="wt-stats">
        <StatCard
          label="Peso atual"
          value={stats.current != null ? `${fmtKg(stats.current)} kg` : '—'}
          sub={latestEntry ? `último: ${fmtKg(latestEntry.weight_kg)} kg` : 'média móvel de 7 dias'}
        />
        <StatCard
          label="Variação total"
          value={stats.variation != null ? `${fmtSigned(stats.variation)} kg` : '—'}
          sub="desde a 1ª semana"
          tone={stats.variation == null || stats.variation === 0 ? 'neutral' : stats.variation < 0 ? 'green' : 'red'}
          icon={stats.variation != null && stats.variation !== 0 ? <IconTrend dir={stats.variation < 0 ? 'down' : 'up'} /> : undefined}
        />
        <StatCard
          label="Ritmo semanal"
          value={stats.rate != null ? `${fmtSigned(stats.rate)} kg` : '—'}
          sub="vs. 7 dias atrás"
          tone={stats.rate == null || stats.rate === 0 ? 'neutral' : stats.rate < 0 ? 'green' : 'red'}
          icon={stats.rate != null && stats.rate !== 0 ? <IconTrend dir={stats.rate < 0 ? 'down' : 'up'} /> : undefined}
        />
        <StatCard
          label="Faltam para a meta"
          value={stats.distance != null ? (stats.distance <= 0 ? 'atingida' : `${fmtKg(stats.distance)} kg`) : '—'}
          sub={goal != null ? `meta ${fmtKg(goal)} kg` : 'defina a meta'}
          tone={stats.distance != null && stats.distance <= 0 ? 'green' : 'neutral'}
        />
      </div>

      <GoalEditor goal={goal} onSave={saveGoal} />

      {/* Gráfico */}
      {entries.length > 0 && <WeightChart entriesAsc={entriesAsc} goal={goal} maByDate={maByDate} />}

      {/* Histórico */}
      {entries.length === 0 ? (
        <div className="goals-empty">
          <p>Nenhum registro ainda.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Registre seu peso no formulário acima para começar a acompanhar a evolução.</p>
        </div>
      ) : (
        <section className="list-card">
          <header className="list-card-head">
            <span>Histórico</span>
            <span className="list-count">{entries.length} {entries.length === 1 ? 'registro' : 'registros'}</span>
          </header>
          <div className="wt-history">
            {entriesDesc.slice(0, visibleCount).map((entry, i) => {
              // registro cronologicamente anterior (próximo item na lista desc)
              const prev = entriesDesc[i + 1] ?? null
              return (
                <HistoryRow key={entry.id} entry={entry} prev={prev} onEdit={editEntry} onDelete={deleteEntry} />
              )
            })}
          </div>
          {visibleCount < entriesDesc.length && (
            <div className="wt-load-more">
              <button className="btn-ghost" onClick={() => setVisibleCount(c => c + 30)}>
                Carregar mais
              </button>
            </div>
          )}
        </section>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
