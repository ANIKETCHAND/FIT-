/* FitTrack: Supabase Client & Configuration Engine */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: "env" | "custom" | "none";
  isConfigured: boolean;
}

let _clientInstance: SupabaseClient | null = null;
let _cachedUrl = "";
let _cachedKey = "";

export function getSupabaseConfig(): SupabaseConfig {
  const customUrl = localStorage.getItem("fittrack_supabase_url")?.trim();
  const customKey = localStorage.getItem("fittrack_supabase_anon_key")?.trim();

  if (customUrl && customKey) {
    return {
      url: customUrl,
      anonKey: customKey,
      source: "custom",
      isConfigured: true,
    };
  }

  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (envUrl && envKey) {
    return {
      url: envUrl,
      anonKey: envKey,
      source: "env",
      isConfigured: true,
    };
  }

  return {
    url: "",
    anonKey: "",
    source: "none",
    isConfigured: false,
  };
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (_clientInstance && _cachedUrl === config.url && _cachedKey === config.anonKey) {
    return _clientInstance;
  }

  try {
    _cachedUrl = config.url;
    _cachedKey = config.anonKey;
    _clientInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return _clientInstance;
  } catch (err) {
    console.error("[Supabase Client] Init error:", err);
    return null;
  }
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (cleanUrl && cleanKey) {
    localStorage.setItem("fittrack_supabase_url", cleanUrl);
    localStorage.setItem("fittrack_supabase_anon_key", cleanKey);
  } else {
    localStorage.removeItem("fittrack_supabase_url");
    localStorage.removeItem("fittrack_supabase_anon_key");
  }

  _clientInstance = null;
  _cachedUrl = "";
  _cachedKey = "";
}

export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const url = customUrl?.trim() || getSupabaseConfig().url;
  const key = customKey?.trim() || getSupabaseConfig().anonKey;

  if (!url || !key) {
    return { success: false, message: "Missing Supabase URL or Anon Key." };
  }

  const start = performance.now();
  try {
    const tempClient = createClient(url, key, {
      auth: { persistSession: false },
    });

    // Test query against users table or health check
    const { error } = await tempClient.from("users").select("id").limit(1);

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      // If table does not exist yet, connection is still valid Supabase endpoint
      if (error.code === "PGRST204" || error.code === "42P01" || error.message.includes("does not exist")) {
        return {
          success: true,
          latencyMs,
          message: `Connected to Supabase (${latencyMs}ms), but schema tables are not yet created. Run schema.sql in Supabase SQL editor.`,
        };
      }
      return { success: false, message: error.message };
    }

    return {
      success: true,
      latencyMs,
      message: `Successfully connected to Supabase (${latencyMs}ms)! All tables ready.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to reach Supabase project.",
    };
  }
}
