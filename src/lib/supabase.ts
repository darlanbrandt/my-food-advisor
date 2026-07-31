import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Usa a service_role key — só roda no servidor (API Routes)
// Nunca exponha esta chave no cliente
//
// A instância é criada de forma preguiçosa (lazy): createClient() só é chamado
// no primeiro uso, em runtime — nunca no import do módulo. Isso evita que o
// build do Next (fase "Collecting page data", que importa cada route handler)
// exija as variáveis de ambiente do Supabase, que podem não existir no ambiente
// de build (ex.: deploys de Preview no Vercel). Em runtime as envs estão presentes.
let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return client
}
