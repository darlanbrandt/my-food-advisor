import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `Você é um nutricionista. Retorne SOMENTE JSON válido, sem markdown, sem texto extra.
Gere um plano alimentar semanal de 7 dias personalizado para o usuário com as seguintes características:
- Tem esofagite — sem alimentos ácidos, picantes, gordurosos à noite, sem café próximo de dormir
- Possível intolerância a lactose — usar apenas laticínios zero lactose
- Não come peixes/frutos do mar cozidos
- Não come: rúcula, pimentão verde, chuchu, mandioca
- Não come frutas exceto banana
- Prefere batata-doce (incluindo roxa), batata-baroa e batata inglesa como carboidratos
- Não toma café da manhã; tem 4 momentos: lanche manhã (10h), almoço (12h), lanche tarde (16h), jantar (19h)
- Jantar sempre leve (ovos, sopas, caldos)
- Preparo rápido, batch cooking domingo
- Baixo teor de gordura, alto em proteína e fibra

Retorne EXATAMENTE este formato JSON:
{
  "days": [
    {
      "day": "Segunda",
      "meals": {
        "morning_snack":    { "name": "...", "detail": "...", "tags": ["proteína"] },
        "lunch":            { "name": "...", "detail": "...", "tags": ["proteína", "fibra"] },
        "afternoon_snack":  { "name": "...", "detail": "...", "tags": [] },
        "dinner":           { "name": "...", "detail": "...", "tags": ["proteína", "esofagite ok"] }
      }
    }
  ],
  "shopping_list": {
    "Proteínas": ["item 1"],
    "Laticínios ZL": [],
    "Carboidratos": [],
    "Vegetais": [],
    "Frutas": [],
    "Extras": []
  },
  "substitutions": [
    { "status": "manter", "title": "...", "body": "..." }
  ],
  "esophagitis_tips": {
    "avoid":   ["..."],
    "habits":  ["..."],
    "lactose": ["..."]
  }
}`

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
    // Nenhum plano salvo ainda — gera o primeiro automaticamente
    return generateAndSave()
  }

  return NextResponse.json({ meta: { id: data.id, created_at: data.created_at, label: data.label }, ...data.plan_data })
}

// POST /api/meal-plan — força regeneração e salva como novo plano ativo
export async function POST() {
  return generateAndSave()
}

// GET /api/meal-plan/history — lista histórico (ver route separada abaixo)
// PATCH /api/meal-plan — atualiza label ou restaura plano antigo como ativo
export async function PATCH(req: NextRequest) {
  const body = await req.json()

  // Renomear plano: { id, label }
  if (body.label !== undefined) {
    const { error } = await supabase
      .from('meal_plans')
      .update({ label: body.label })
      .eq('id', body.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Restaurar plano antigo como ativo: { id, activate: true }
  if (body.activate) {
    const { error } = await supabase
      .from('meal_plans')
      .update({ is_active: true })
      .eq('id', body.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
}

// ─── helpers ────────────────────────────────────────────────────────────────

async function generateAndSave() {
  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'Gere o plano semanal completo.' }],
    })

    const raw = (msg.content[0] as { text: string }).text
    const planData = JSON.parse(raw)

    // Gera label automático com semana e data
    const now = new Date()
    const week = getWeekNumber(now)
    const label = `Semana ${week} — ${now.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`

    const { data, error } = await supabase
      .from('meal_plans')
      .insert({ plan_data: planData, label, is_active: true })
      .select('id, created_at, label')
      .single()

    if (error) throw error

    return NextResponse.json({ meta: { id: data.id, created_at: data.created_at, label: data.label }, ...planData })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Falha ao gerar plano' }, { status: 500 })
  }
}

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
