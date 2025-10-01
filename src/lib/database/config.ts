import { createClient } from "@supabase/supabase-js"

// Configuration Supabase avec types générés
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client public (browser) - utilise le client existant pour l'instant
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client admin (server-side uniquement)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

// Configuration des tables avec RLS
export const TABLES = {
  // Platform level
  PLATFORM_ADMINS: "platform_admins",

  // Organization level
  ORGANIZATIONS: "organizations",
  WORKSPACES: "workspaces",
  WORKSPACE_MEMBERS: "workspace_members",
  WORKSPACE_INVITATIONS: "workspace_invitations",

  // Functional resources
  BOTS: "bots",
  KNOWLEDGE_BASES: "knowledge_bases",

  // Audit
  AUDIT_LOGS: "audit_logs",
} as const

// Helper pour vérifier la connexion
export async function testConnection() {
  try {
    const { error } = await supabase
      .from("organizations")
      .select("count")
      .limit(1)

    if (error) {
      console.error("Supabase connection error:", error)
      return false
    }
    return true
  } catch (error) {
    console.error("Supabase connection failed:", error)
    return false
  }
}

// Helper pour les requêtes avec gestion d'erreur
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await queryFn()

    if (error) {
      console.error("Database query error:", error)
      return { data: null, error: error.message || "Database error occurred" }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Unexpected database error:", error)
    return { data: null, error: "Unexpected error occurred" }
  }
}
