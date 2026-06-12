export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/* ── tipos ─────────────────────────────────────────────────── */
type Goal = { id: string; name: string }
type Period = {
  name: string
  start_date: string
  end_date: string
  goals: Goal[]
  checks: Record<string, true>
}

const MAX_NAME_LEN = 120
const MAX_GOALS    = 50
const MAX_CHECKS   = 50 * 366   // 50 metas × 366 dias

/* ── helpers de validação ───────────────────────────────────── */
function isDateStr(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function isGoalArray(v: unknown): v is Goal[] {
  return Array.isArray(v) && v.length <= MAX_GOALS &&
    v.every(g => typeof (g as Goal).id === 'string' && typeof (g as Goal).name === 'string')
}

function isChecksMap(v: unknown): v is Record<string, true> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const entries = Object.entries(v)
  if (entries.length > MAX_CHECKS) return false
  return entries.every(([k, val]) =>
    /^[a-z0-9_-]+\/\d{4}-\d{2}-\d{2}$/i.test(k) && val === true
  )
}

function sanitize(s: string) {
  return s.trim().slice(0, MAX_NAME_LEN)
}

function validatePeriod(body: Record<string, unknown>): { ok: true; data: Period } | { ok: false; error: string } {
  if (typeof body.name !== 'string' || !body.name.trim())
    return { ok: false, error: '"name" é obrigatório.' }
  if (!isDateStr(body.start_date))
    return { ok: false, error: '"start_date" deve ser YYYY-MM-DD.' }
  if (!isDateStr(body.end_date))
    return { ok: false, error: '"end_date" deve ser YYYY-MM-DD.' }
  if (body.start_date > body.end_date)
    return { ok: false, error: '"start_date" não pode ser depois de "end_date".' }
  if (body.goals !== undefined && !isGoalArray(body.goals))
    return { ok: false, error: '"goals" inválido.' }
  if (body.checks !== undefined && !isChecksMap(body.checks))
    return { ok: false, error: '"checks" inválido.' }
  return {
    ok: true,
    data: {
      name:       sanitize(body.name as string),
      start_date: body.start_date as string,
      end_date:   body.end_date as string,
      goals:      (body.goals as Goal[] | undefined) ?? [],
      checks:     (body.checks as Record<string, true> | undefined) ?? {},
    },
  }
}

/* ── GET /api/goals ─────────────────────────────────────────── */
export async function GET() {
  const { data, error } = await supabase
    .from('goal_periods')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/* ── POST /api/goals — cria novo período ────────────────────── */
export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return NextResponse.json({ error: 'Esperado um objeto.' }, { status: 400 })

  const result = validatePeriod(body as Record<string, unknown>)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  const { data, error } = await supabase
    .from('goal_periods')
    .insert(result.data)
    .select()
    .single()

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Falha ao criar período.' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

/* ── PATCH /api/goals — atualiza período existente ─────────── */
export async function PATCH(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return NextResponse.json({ error: 'Esperado um objeto.' }, { status: 400 })

  const b = body as Record<string, unknown>

  if (typeof b.id !== 'string' || !b.id.trim())
    return NextResponse.json({ error: '"id" é obrigatório.' }, { status: 400 })

  // Constrói o patch com apenas os campos presentes e validados
  const patch: Partial<Period> = {}

  if (b.name !== undefined) {
    if (typeof b.name !== 'string' || !b.name.trim())
      return NextResponse.json({ error: '"name" inválido.' }, { status: 400 })
    patch.name = sanitize(b.name)
  }
  if (b.start_date !== undefined) {
    if (!isDateStr(b.start_date))
      return NextResponse.json({ error: '"start_date" deve ser YYYY-MM-DD.' }, { status: 400 })
    patch.start_date = b.start_date
  }
  if (b.end_date !== undefined) {
    if (!isDateStr(b.end_date))
      return NextResponse.json({ error: '"end_date" deve ser YYYY-MM-DD.' }, { status: 400 })
    patch.end_date = b.end_date
  }
  if (patch.start_date && patch.end_date && patch.start_date > patch.end_date)
    return NextResponse.json({ error: '"start_date" não pode ser depois de "end_date".' }, { status: 400 })

  if (b.goals !== undefined) {
    if (!isGoalArray(b.goals))
      return NextResponse.json({ error: '"goals" inválido.' }, { status: 400 })
    patch.goals = (b.goals as Goal[]).map(g => ({
      id:   sanitize(g.id),
      name: sanitize(g.name),
    }))
  }
  if (b.checks !== undefined) {
    if (!isChecksMap(b.checks))
      return NextResponse.json({ error: '"checks" inválido.' }, { status: 400 })
    patch.checks = b.checks as Record<string, true>
  }

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })

  const { data, error } = await supabase
    .from('goal_periods')
    .update(patch)
    .eq('id', b.id)
    .select()
    .single()

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Falha ao atualizar período.' }, { status: 500 })
  }
  return NextResponse.json(data)
}

/* ── DELETE /api/goals — remove período ─────────────────────── */
export async function DELETE(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  const b = body as Record<string, unknown>

  if (typeof b.id !== 'string' || !b.id.trim())
    return NextResponse.json({ error: '"id" é obrigatório.' }, { status: 400 })

  const { error } = await supabase
    .from('goal_periods')
    .delete()
    .eq('id', b.id)

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Falha ao remover período.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
