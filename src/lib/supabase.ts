import { createClient } from '@supabase/supabase-js'

// Usa a service_role key — só roda no servidor (API Routes)
// Nunca exponha esta chave no cliente
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
