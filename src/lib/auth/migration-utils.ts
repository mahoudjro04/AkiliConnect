/**
 * Services pour gérer la migration des utilisateurs d'Akili Connect
 * Migration de la table users custom vers auth.users de Supabase
 */

import { createClient } from "@/supabase/server"

/**
 * Synchronise un utilisateur de la table users vers auth.users
 */
export async function syncUserToAuth(userData: {
  email: string
  first_name?: string
  last_name?: string
  platform_role?: "super_admin" | "user" | "support"
}) {
  try {
    const supabase = await createClient()

    // 1. Créer l'utilisateur dans Supabase Auth (ou récupérer s'il existe)
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers.users.find(
      (u) => u.email === userData.email
    )

    let userId: string

    if (existingUser) {
      userId = existingUser.id
      console.log(`Utilisateur existant trouvé: ${userData.email}`)
    } else {
      // Créer le nouvel utilisateur
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        email_confirm: true, // Skip email confirmation
        user_metadata: {
          first_name: userData.first_name,
          last_name: userData.last_name,
        },
        app_metadata: {
          platform_role: userData.platform_role || "user",
        },
      })

      if (error) {
        throw new Error(`Erreur création utilisateur: ${error.message}`)
      }

      userId = newUser.user.id
      console.log(`Nouvel utilisateur créé: ${userData.email}`)
    }

    // 2. Mettre à jour les métadonnées si l'utilisateur existait déjà
    if (existingUser) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            first_name: userData.first_name,
            last_name: userData.last_name,
          },
          app_metadata: {
            platform_role: userData.platform_role || "user",
          },
        }
      )

      if (updateError) {
        throw new Error(
          `Erreur mise à jour métadonnées: ${updateError.message}`
        )
      }
    }

    return { success: true, userId, isNew: !existingUser }
  } catch (error) {
    console.error(`Erreur sync utilisateur ${userData.email}:`, error)
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: errorMessage }
  }
}

/**
 * Migre tous les utilisateurs de la table users vers auth.users
 */
export async function migrateAllUsersToAuth() {
  try {
    const supabase = await createClient()

    // Récupérer tous les utilisateurs de la table users
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, platform_role")

    if (error) {
      throw new Error(`Erreur récupération utilisateurs: ${error.message}`)
    }

    const results = []

    for (const user of users) {
      const result = await syncUserToAuth({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        platform_role: user.platform_role,
      })

      results.push({
        originalId: user.id,
        email: user.email,
        ...result,
      })
    }

    return {
      success: true,
      results,
      summary: {
        total: users.length,
        created: results.filter((r) => r.success && r.isNew).length,
        updated: results.filter((r) => r.success && !r.isNew).length,
        failed: results.filter((r) => !r.success).length,
      },
    }
  } catch (error) {
    console.error("Erreur migration globale:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: errorMessage }
  }
}

/**
 * Met à jour les IDs dans workspace_members après migration
 */
export async function updateWorkspaceMemberIds(
  mappings: Array<{
    oldId: string
    newId: string
    email: string
  }>
) {
  try {
    const supabase = await createClient()

    for (const mapping of mappings) {
      // Mettre à jour user_id dans workspace_members
      const { error: updateError } = await supabase
        .from("workspace_members")
        .update({ user_id: mapping.newId })
        .eq("user_id", mapping.oldId)

      if (updateError) {
        console.error(
          `Erreur mise à jour workspace_members pour ${mapping.email}:`,
          updateError
        )
      }

      // Mettre à jour invited_by dans workspace_members
      await supabase
        .from("workspace_members")
        .update({ invited_by: mapping.newId })
        .eq("invited_by", mapping.oldId)

      // Mettre à jour les autres tables...
      await supabase
        .from("role_change_logs")
        .update({ target_user_id: mapping.newId })
        .eq("target_user_id", mapping.oldId)

      await supabase
        .from("role_change_logs")
        .update({ actor_user_id: mapping.newId })
        .eq("actor_user_id", mapping.oldId)
    }

    return { success: true }
  } catch (error) {
    console.error("Erreur mise à jour IDs:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: errorMessage }
  }
}
