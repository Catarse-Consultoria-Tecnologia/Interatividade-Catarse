"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let warned = false;

/**
 * Cliente Supabase do navegador — só usado para assinar canais do Realtime
 * (Broadcast). Nunca lê/escreve tabelas diretamente daqui: todas as mutações
 * passam pelas rotas de API, que usam o cliente admin no servidor.
 *
 * Retorna `null` (em vez de lançar) quando as variáveis não estão configuradas, para
 * que a tela continue funcionando em modo "sem tempo real" (cada ação ainda atualiza
 * a própria tela via busca HTTP) em vez de quebrar a página inteira.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (!warned) {
      // eslint-disable-next-line no-console
      console.warn(
        "[realtime] NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas — sem sincronização ao vivo.",
      );
      warned = true;
    }
    return null;
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return client;
}
