import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

let _supabaseClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (_supabaseClient) {
    return _supabaseClient;
  }

  const url = ENV.supabaseUrl;
  const key = ENV.supabaseServiceRoleKey || ENV.supabaseAnonKey;

  if (url && key) {
    try {
      _supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log("[Supabase Server] Connected successfully to:", url);
    } catch (err) {
      console.error("[Supabase Server] Failed to initialize client:", err);
      _supabaseClient = null;
    }
  }

  return _supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(ENV.supabaseUrl && (ENV.supabaseServiceRoleKey || ENV.supabaseAnonKey));
}
