import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Retorna todos os planos salvos (sem o plan_data completo — só metadados)
export async function GET() {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('id, created_at, label, is_active')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
