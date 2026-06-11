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
    const body = await req.json()

    // Validação mínima
    if (!body.days || !Array.isArray(body.days)) {
      return NextResponse.json({ error: 'JSON inválido — campo "days" ausente ou incorreto.' }, { status: 400 })
    }

    const { label, ...planData } = body

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
