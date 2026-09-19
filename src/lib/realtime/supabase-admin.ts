import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Cliente Supabase com a service role key — só roda em rotas de API (server-side).
 * Usado exclusivamente para publicar (broadcast) atualizações de estado; a leitura e
 * escrita do jogo em si continuam indo direto pelo Prisma/Postgres, não pelo Supabase.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configuradas.");
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return client;
}
