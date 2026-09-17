'use client'
import { useState, useEffect, useRef } from 'react'

/* ── helpers de data (local, sem timezone) ──────────────────── */
// Converte um Date para string YYYY-MM-DD no fuso local
function iso(d: Date) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}
// Faz o parse de YYYY-MM-DD para um Date local (meia-noite local)
function parse(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
// Soma n dias a uma data, retornando uma nova instância
function addDays(d: Date, n: number) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}
// Data de hoje zerada (meia-noite local)
function today() { const t = new Date(); t.setHours(0, 0, 0, 0); return t }

const MONTHS_LONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
                     'Agosto','Setembro','Outubro','Novembro','Dezembro']

/* ── ícone ──────────────────────────────────────────────────── */
// Chevron usado nos botões de navegação de mês
function IconChevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left'
        ? <path d="M9 2.5 4.5 7 9 11.5" />
        : <path d="M5 2.5 9.5 7 5 11.5" />}
    </svg>
  )
}

/* ── calendar picker customizado ────────────────────────────── */
// Seletor de data com popup de calendário, reutilizado nas abas Metas e Peso.
// Recebe/emite datas no formato YYYY-MM-DD. `maxDate` (opcional, YYYY-MM-DD)
// desabilita dias posteriores a ele — usado no Peso para impedir data futura.
export default function CalendarPicker({ value, onChange, ariaLabel, maxDate }: {
  value: string; onChange: (v: string) => void; ariaLabel: string; maxDate?: string
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
              // desabilita dias após maxDate (quando informado)
              const isDisabled = !!maxDate && iso(date) > maxDate
              return (
                <button key={i} type="button"
                  disabled={isDisabled}
                  className={['dp-day', outside ? 'dp-outside' : '', isSelected ? 'dp-selected' : '', isToday && !isSelected ? 'dp-today' : '', isDisabled ? 'dp-disabled' : ''].filter(Boolean).join(' ')}
                  aria-label={`${date.getDate()} de ${MONTHS_LONG[date.getMonth()]} de ${date.getFullYear()}${isSelected ? ' (selecionado)' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => { if (!isDisabled) selectDay(date) }}>
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
