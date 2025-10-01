import { createClient } from "@/supabase/server"

import type { PlatformRole } from "@/types/multi-tenant"
import type { User } from "@supabase/supabase-js"

/**
 * Vérifie si un utilisateur a les droits super admin
 * Utilise auth.users.app_metadata pour stocker le platform_role
 */
export async function checkSuperAdminAccess(
  user: User
): Promise<{ hasAccess: boolean; platformRole?: PlatformRole }> {
  try {
    // Le platform_role est maintenant stocké dans app_metadata
    const platformRole = user.app_metadata?.platform_role as PlatformRole
    const hasAccess = platformRole === "super_admin"

    return { hasAccess, platformRole }
  } catch (error) {
    console.error("Error checking super admin access:", error)
    return { hasAccess: false }
  }
}

/**
 * Assigne un rôle platform à un utilisateur via app_metadata
 */
export async function assignPlatformRole(
  userId: string,
  role: PlatformRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { platform_role: role },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error assigning platform role:", error)
    return { success: false, error: "Internal server error" }
  }
}

/**
 * Middleware pour les routes admin qui nécessitent les droits super admin
 */
export async function requireSuperAdmin(): Promise<{
  user: User | null
  error?: { message: string; status: number }
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        user: null,
        error: { message: "Authentication required", status: 401 },
      }
    }

    const { hasAccess } = await checkSuperAdminAccess(user)
    if (!hasAccess) {
      return {
        user: null,
        error: {
          message: "Super admin access required",
          status: 403,
        },
      }
    }

    return { user }
  } catch (error) {
    console.error("Error in requireSuperAdmin:", error)
    return {
      user: null,
      error: { message: "Internal server error", status: 500 },
    }
  }
}
