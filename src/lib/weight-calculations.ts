// Cálculos puros do módulo de Peso — sem React, fáceis de testar.
// Regra da média móvel: média dos registros existentes dentro da janela de
// 7 dias corridos (dias sem registro NÃO entram como zero).

/* ── tipos ─────────────────────────────────────────────────── */
export type WeightEntry = {
  id: string
  entry_date: string        // YYYY-MM-DD
  weight_kg: number
  note: string | null
  created_at?: string
  updated_at?: string
}

export type WeightSettings = {
  goal_weight_kg: number | null
}

/* ── limites de validação ──────────────────────────────────── */
export const MIN_WEIGHT = 30
export const MAX_WEIGHT = 250

/* ── helpers internos de data (strings YYYY-MM-DD) ─────────── */
// Comparar strings YYYY-MM-DD lexicograficamente equivale a comparar datas.

// Converte YYYY-MM-DD em Date local (meia-noite)
function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
// Converte Date local em YYYY-MM-DD
function toISO(d: Date): string {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}
// Desloca uma data-string em `days` dias
function shiftISO(iso: string, days: number): string {
  const d = toDate(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}
// Média simples do peso de uma lista de registros
function avg(list: WeightEntry[]): number {
  return list.reduce((sum, e) => sum + e.weight_kg, 0) / list.length
}

/* ── ordenação ─────────────────────────────────────────────── */
// Retorna uma cópia ordenada por data crescente (não muta a entrada)
export function sortByDate(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date))
}

// Data do primeiro e do último registro (assume lista não vazia)
function firstDate(entries: WeightEntry[]): string {
  return entries.reduce((min, e) => (e.entry_date < min ? e.entry_date : min), entries[0].entry_date)
}
function lastDate(entries: WeightEntry[]): string {
  return entries.reduce((max, e) => (e.entry_date > max ? e.entry_date : max), entries[0].entry_date)
}

/* ── média móvel de 7 dias corridos ─────────────────────────── */
// Média dos registros na janela [refISO-6, refISO]. null se não houver nenhum.
export function movingAverage7(entries: WeightEntry[], refISO: string): number | null {
  const startISO = shiftISO(refISO, -6)
  const inWindow = entries.filter(e => e.entry_date >= startISO && e.entry_date <= refISO)
  return inWindow.length ? avg(inWindow) : null
}

// Média móvel "atual": referência no último registro existente
export function currentAverage(entries: WeightEntry[]): number | null {
  if (!entries.length) return null
  return movingAverage7(entries, lastDate(entries))
}

// Média da primeira semana registrada (janela [primeiro, primeiro+6])
export function firstWeekAverage(entries: WeightEntry[]): number | null {
  if (!entries.length) return null
  const start = firstDate(entries)
  const endISO = shiftISO(start, 6)
  const inWindow = entries.filter(e => e.entry_date >= start && e.entry_date <= endISO)
  return inWindow.length ? avg(inWindow) : null
}

/* ── indicadores ───────────────────────────────────────────── */
// Ritmo semanal (kg/semana): média móvel de hoje menos a de 7 dias atrás.
// Negativo = perda. null se faltar dado em qualquer das janelas.
export function weeklyRate(entries: WeightEntry[]): number | null {
  if (!entries.length) return null
  const latest = lastDate(entries)
  const now  = movingAverage7(entries, latest)
  const prev = movingAverage7(entries, shiftISO(latest, -7))
  if (now === null || prev === null) return null
  return now - prev
}

// Variação total: média atual menos a média da primeira semana
export function totalVariation(entries: WeightEntry[]): number | null {
  const cur = currentAverage(entries)
  const first = firstWeekAverage(entries)
  if (cur === null || first === null) return null
  return cur - first
}

// Distância até a meta: média atual menos o peso-meta (positivo = acima da meta)
export function goalDistance(entries: WeightEntry[], goalWeightKg: number | null): number | null {
  const cur = currentAverage(entries)
  if (cur === null || goalWeightKg == null) return null
  return cur - goalWeightKg
}

// Perda acelerada sustentada: ritmo de perda acima do limite (0,5 kg/sem por
// padrão) em duas semanas seguidas. Compara MA(t), MA(t-7) e MA(t-14).
export function sustainedRapidLoss(entries: WeightEntry[], thresholdKgPerWeek = 0.5): boolean {
  if (!entries.length) return false
  const latest = lastDate(entries)
  const ma0 = movingAverage7(entries, latest)
  const ma1 = movingAverage7(entries, shiftISO(latest, -7))
  const ma2 = movingAverage7(entries, shiftISO(latest, -14))
  if (ma0 === null || ma1 === null || ma2 === null) return false
  const rateNow  = ma0 - ma1   // ritmo da última semana
  const ratePrev = ma1 - ma2   // ritmo da semana anterior
  return rateNow < -thresholdKgPerWeek && ratePrev < -thresholdKgPerWeek
}

/* ── série para o gráfico ──────────────────────────────────── */
// Para cada registro (em ordem de data), calcula a média móvel naquela data.
// Serve para desenhar a linha de média móvel do gráfico.
export function movingAverageSeries(entries: WeightEntry[]): Array<{ entry_date: string; avg: number }> {
  const sorted = sortByDate(entries)
  return sorted.map(e => ({
    entry_date: e.entry_date,
    // sempre existe ao menos o próprio registro na janela, então não é null
    avg: movingAverage7(sorted, e.entry_date) as number,
  }))
}

/* ── helpers de formatação / input ─────────────────────────── */
// Formata YYYY-MM-DD como dd/MM/yyyy
export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Data de hoje em America/Sao_Paulo como YYYY-MM-DD (en-CA já usa esse formato)
export function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

// Faz o parse de um peso digitado ("74,8" ou "74.8") para número; null se inválido
export function parseWeightInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : null
}

// Verifica se o peso está na faixa aceita (30–250 kg)
export function isWeightInRange(n: number): boolean {
  return n >= MIN_WEIGHT && n <= MAX_WEIGHT
}
