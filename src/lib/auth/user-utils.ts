/**
 * Utilitaires pour assigner le premier super admin et gérer les métadonnées utilisateur
 * Ces fonctions sont à utiliser côté serveur avec des privilèges admin
 */

import { createClient } from "@/supabase/server"

/**
 * Script pour assigner le premier super admin
 * À exécuter une seule fois après migration vers auth.users
 */
export async function assignFirstSuperAdmin(email: string) {
  try {
    const supabase = await createClient()

    // Récupérer l'utilisateur par email
    const { data: users, error: listError } =
      await supabase.auth.admin.listUsers()

    if (listError) {
      throw new Error(
        `Erreur lors de la récupération des utilisateurs: ${listError.message}`
      )
    }

    const user = users.users.find((u) => u.email === email)

    if (!user) {
      throw new Error(`Utilisateur avec l'email ${email} non trouvé`)
    }

    // Assigner le rôle super_admin via app_metadata
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: {
        platform_role: "super_admin",
        assigned_at: new Date().toISOString(),
        assigned_by: "system",
      },
    })

    if (error) {
      throw new Error(`Erreur lors de l'assignation: ${error.message}`)
    }

    console.log(`✅ Super admin assigné avec succès à ${email}`)
    return { success: true, userId: user.id }
  } catch (error) {
    console.error("❌ Erreur lors de l'assignation du super admin:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: errorMessage }
  }
}

/**
 * Ajouter des métadonnées utilisateur lors de l'inscription
 */
export async function updateUserMetadata(
  userId: string,
  metadata: {
    first_name?: string
    last_name?: string
    [key: string]: string | number | boolean | null | undefined
  }
) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: metadata,
    })

    if (error) {
      throw new Error(
        `Erreur lors de la mise à jour des métadonnées: ${error.message}`
      )
    }

    return { success: true }
  } catch (error) {
    console.error("Erreur lors de la mise à jour des métadonnées:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: errorMessage }
  }
}

/**
 * Récupérer les informations utilisateur depuis auth.users
 */
export async function getUserInfo(userId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.admin.getUserById(userId)

    if (error) {
      throw new Error(
        `Erreur lors de la récupération de l'utilisateur: ${error.message}`
      )
    }

    const user = data.user

    return {
      id: user.id,
      email: user.email,
      platform_role: user.app_metadata?.platform_role || "user",
      first_name: user.user_metadata?.first_name,
      last_name: user.user_metadata?.last_name,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    }
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des infos utilisateur:",
      error
    )
    return null
  }
}
