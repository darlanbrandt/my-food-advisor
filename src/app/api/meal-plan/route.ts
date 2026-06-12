export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/meal-plan — retorna o plano ativo
export async function GET() {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('id, created_at, label, plan_data')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Nenhum plano encontrado.' }, { status: 404 })
  }

  return NextResponse.json({
    meta: { id: data.id, created_at: data.created_at, label: data.label },
    ...data.plan_data,
  })
}

// POST /api/meal-plan — salva novo plano enviado como JSON
export async function POST(req: NextRequest) {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Corpo da requisição não é um JSON válido.' }, { status: 400 })
    }

    if (!isRecord(body)) {
      return NextResponse.json({ error: 'JSON inválido — esperado um objeto.' }, { status: 400 })
    }

    const result = validatePlan(body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Persiste apenas os campos conhecidos (descarta chaves arbitrárias)
    const planData = result.plan
    const label = typeof body.label === 'string' ? body.label : undefined

    const now = new Date()
    const week = getWeekNumber(now)
    const autoLabel = label ?? `Semana ${week} — ${now.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`

    const { data, error } = await supabase
      .from('meal_plans')
      .insert({ plan_data: planData, label: autoLabel, is_active: true })
      .select('id, created_at, label')
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, meta: { id: data.id, created_at: data.created_at, label: data.label } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Falha ao salvar plano.' }, { status: 500 })
  }
}

// PATCH /api/meal-plan — renomeia ou restaura plano antigo
export async function PATCH(req: NextRequest) {
  const body = await req.json()

  if (body.label !== undefined) {
    const { error } = await supabase
      .from('meal_plans')
      .update({ label: body.label })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.activate) {
    const { error } = await supabase
      .from('meal_plans')
      .update({ is_active: true })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 })
}

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/* ── Validação do plano ─────────────────────────────────────── */

type Meal = { name: string; detail: string; tags: string[] }
type Day = { day: string; meals: Record<string, Meal> }
type PlanData = {
  days: Day[]
  shopping_list?: Record<string, string[]>
  substitutions?: Array<{ status: string; title: string; body: string }>
  esophagitis_tips?: { avoid: string[]; habits: string[]; lactose: string[] }
}

// Limites defensivos para evitar persistir payloads abusivos
const MAX_DAYS = 31
const MAX_ITEMS = 500

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isStringArray(v: unknown, max = MAX_ITEMS): v is string[] {
  return Array.isArray(v) && v.length <= max && v.every(x => typeof x === 'string')
}

function isMeal(v: unknown): v is Meal {
  return isRecord(v)
    && typeof v.name === 'string'
    && typeof v.detail === 'string'
    && isStringArray(v.tags, 20)
}

type ValidationResult = { ok: true; plan: PlanData } | { ok: false; error: string }

function validatePlan(body: Record<string, unknown>): ValidationResult {
  // days — obrigatório, não vazio
  if (!Array.isArray(body.days) || body.days.length === 0) {
    return { ok: false, error: 'JSON inválido — campo "days" ausente ou vazio.' }
  }
  if (body.days.length > MAX_DAYS) {
    return { ok: false, error: `JSON inválido — "days" excede o limite de ${MAX_DAYS}.` }
  }
  const days: Day[] = []
  for (let i = 0; i < body.days.length; i++) {
    const raw = body.days[i]
    if (!isRecord(raw) || typeof raw.day !== 'string' || !isRecord(raw.meals)) {
      return { ok: false, error: `JSON inválido — "days[${i}]" malformado.` }
    }
    const meals: Record<string, Meal> = {}
    for (const [key, meal] of Object.entries(raw.meals)) {
      if (!isMeal(meal)) {
        return { ok: false, error: `JSON inválido — refeição "${key}" em "days[${i}]" malformada.` }
      }
      meals[key] = { name: meal.name, detail: meal.detail, tags: meal.tags }
    }
    days.push({ day: raw.day, meals })
  }

  const plan: PlanData = { days }

  // shopping_list — opcional
  if (body.shopping_list !== undefined) {
    if (!isRecord(body.shopping_list)) {
      return { ok: false, error: 'JSON inválido — "shopping_list" deve ser um objeto.' }
    }
    const list: Record<string, string[]> = {}
    for (const [cat, items] of Object.entries(body.shopping_list)) {
      if (!isStringArray(items)) {
        return { ok: false, error: `JSON inválido — "shopping_list.${cat}" deve ser uma lista de strings.` }
      }
      list[cat] = items
    }
    plan.shopping_list = list
  }

  // substitutions — opcional
  if (body.substitutions !== undefined) {
    if (!Array.isArray(body.substitutions) || body.substitutions.length > MAX_ITEMS) {
      return { ok: false, error: 'JSON inválido — "substitutions" deve ser uma lista.' }
    }
    const subs = body.substitutions.map(s =>
      isRecord(s) && typeof s.status === 'string' && typeof s.title === 'string' && typeof s.body === 'string'
        ? { status: s.status, title: s.title, body: s.body }
        : null
    )
    if (subs.some(s => s === null)) {
      return { ok: false, error: 'JSON inválido — itens de "substitutions" malformados.' }
    }
    plan.substitutions = subs as PlanData['substitutions']
  }

  // esophagitis_tips — opcional
  if (body.esophagitis_tips !== undefined) {
    const t = body.esophagitis_tips
    if (!isRecord(t) || !isStringArray(t.avoid) || !isStringArray(t.habits) || !isStringArray(t.lactose)) {
      return { ok: false, error: 'JSON inválido — "esophagitis_tips" malformado.' }
    }
    plan.esophagitis_tips = { avoid: t.avoid, habits: t.habits, lactose: t.lactose }
  }

  return { ok: true, plan }
}
