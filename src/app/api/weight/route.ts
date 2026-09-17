export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { MIN_WEIGHT, MAX_WEIGHT, todayInSaoPaulo } from '@/lib/weight-calculations'

const NOTE_MAX_LEN = 500

/* ── helpers de validação ───────────────────────────────────── */
// Confere se o valor é uma string de data YYYY-MM-DD
function isDateStr(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}
// Confere se o peso é um número finito dentro da faixa aceita
function isValidWeight(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= MIN_WEIGHT && v <= MAX_WEIGHT
}
// Normaliza a observação: apara, limita o tamanho e vira null se vazia
function normalizeNote(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, NOTE_MAX_LEN)
  return t || null
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
// Postgres numeric volta como string no supabase-js — converte para número
function toNum(v: unknown): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
// Serializa um registro do banco garantindo weight_kg numérico
function serializeEntry(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    entry_date: row.entry_date as string,
    weight_kg: toNum(row.weight_kg),
    note: (row.note as string | null) ?? null,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  }
}

const ENTRY_COLS = 'id, entry_date, weight_kg, note, created_at, updated_at'

/* ── GET /api/weight — registros + configuração ─────────────── */
export async function GET() {
  const supabase = getSupabase()
  // busca registros e configuração em paralelo
  const [entriesRes, settingsRes] = await Promise.all([
    supabase.from('weight_entries').select(ENTRY_COLS).order('entry_date', { ascending: false }),
    supabase.from('weight_settings').select('goal_weight_kg').eq('id', 1).maybeSingle(),
  ])

  if (entriesRes.error) {
    console.error(entriesRes.error)
    return NextResponse.json({ error: 'Falha ao carregar registros de peso.' }, { status: 500 })
  }

  const entries = (entriesRes.data ?? []).map(serializeEntry)
  const goal = toNum(settingsRes.data?.goal_weight_kg)
  return NextResponse.json({ entries, settings: { goal_weight_kg: goal } })
}

/* ── POST /api/weight — cria/substitui o registro do dia (upsert) ── */
export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  if (!isRecord(body)) return NextResponse.json({ error: 'Esperado um objeto.' }, { status: 400 })

  if (!isDateStr(body.entry_date))
    return NextResponse.json({ error: '"entry_date" deve ser YYYY-MM-DD.' }, { status: 400 })
  if (body.entry_date > todayInSaoPaulo())
    return NextResponse.json({ error: 'A data não pode ser futura.' }, { status: 400 })
  if (!isValidWeight(body.weight_kg))
    return NextResponse.json({ error: `O peso deve estar entre ${MIN_WEIGHT} e ${MAX_WEIGHT} kg.` }, { status: 400 })

  const now = new Date().toISOString()
  // upsert por entry_date: se já existir registro na data, substitui o valor
  const { data, error } = await supabase
    .from('weight_entries')
    .upsert(
      { entry_date: body.entry_date, weight_kg: body.weight_kg, note: normalizeNote(body.note), updated_at: now },
      { onConflict: 'entry_date' },
    )
    .select(ENTRY_COLS)
    .single()

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Falha ao salvar registro.' }, { status: 500 })
  }
  return NextResponse.json(serializeEntry(data))
}

/* ── PATCH /api/weight — edita um registro existente por id ──── */
export async function PATCH(req: NextRequest) {
  const supabase = getSupabase()
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  if (!isRecord(body)) return NextResponse.json({ error: 'Esperado um objeto.' }, { status: 400 })
  if (typeof body.id !== 'string' || !body.id.trim())
    return NextResponse.json({ error: '"id" é obrigatório.' }, { status: 400 })

  // monta o patch apenas com os campos presentes e válidos
  const patch: Record<string, unknown> = {}
  if (body.weight_kg !== undefined) {
    if (!isValidWeight(body.weight_kg))
      return NextResponse.json({ error: `O peso deve estar entre ${MIN_WEIGHT} e ${MAX_WEIGHT} kg.` }, { status: 400 })
    patch.weight_kg = body.weight_kg
  }
  if (body.entry_date !== undefined) {
    if (!isDateStr(body.entry_date))
      return NextResponse.json({ error: '"entry_date" deve ser YYYY-MM-DD.' }, { status: 400 })
    if (body.entry_date > todayInSaoPaulo())
      return NextResponse.json({ error: 'A data não pode ser futura.' }, { status: 400 })
    patch.entry_date = body.entry_date
  }
  if (body.note !== undefined) patch.note = normalizeNote(body.note)

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('weight_entries')
    .update(patch)
    .eq('id', body.id)
    .select(ENTRY_COLS)
    .single()

  if (error) {
    // 23505 = violação de unicidade (já existe registro na data escolhida)
    if (error.code === '23505')
      return NextResponse.json({ error: 'Já existe um registro nessa data.' }, { status: 409 })
    console.error(error)
    return NextResponse.json({ error: 'Falha ao atualizar registro.' }, { status: 500 })
  }
  return NextResponse.json(serializeEntry(data))
}

/* ── DELETE /api/weight — remove um registro por id ─────────── */
export async function DELETE(req: NextRequest) {
  const supabase = getSupabase()
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  if (!isRecord(body) || typeof body.id !== 'string' || !body.id.trim())
    return NextResponse.json({ error: '"id" é obrigatório.' }, { status: 400 })

  const { error } = await supabase.from('weight_entries').delete().eq('id', body.id)
  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Falha ao remover registro.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

/* ── PUT /api/weight — define o peso-meta (linha única id=1) ─── */
export async function PUT(req: NextRequest) {
  const supabase = getSupabase()
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  if (!isRecord(body)) return NextResponse.json({ error: 'Esperado um objeto.' }, { status: 400 })

  // aceita null para limpar a meta, ou um número dentro da faixa
  const goal = body.goal_weight_kg
  if (goal !== null && !isValidWeight(goal))
    return NextResponse.json({ error: `A meta deve estar entre ${MIN_WEIGHT} e ${MAX_WEIGHT} kg.` }, { status: 400 })

  const { data, error } = await supabase
    .from('weight_settings')
    .upsert({ id: 1, goal_weight_kg: goal, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select('goal_weight_kg')
    .single()

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Falha ao salvar a meta.' }, { status: 500 })
  }
  return NextResponse.json({ goal_weight_kg: toNum(data.goal_weight_kg) })
}
