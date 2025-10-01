/**
 * Script pour assigner le premier super admin après migration vers auth.users
 * À exécuter une seule fois via l'API ou en tant que script autonome
 */

import { assignFirstSuperAdmin } from "@/lib/auth/user-utils"

/**
 * Route API pour assigner le premier super admin
 * POST /api/admin/setup-super-admin
 * Body: { email: "votre-email@example.com" }
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return Response.json({ error: "Email requis" }, { status: 400 })
    }

    const result = await assignFirstSuperAdmin(email)

    if (result.success) {
      return Response.json({
        message: `Super admin assigné avec succès à ${email}`,
        userId: result.userId,
      })
    } else {
      return Response.json({ error: result.error }, { status: 400 })
    }
  } catch (error) {
    console.error("Erreur lors de l'assignation du super admin:", error)
    return Response.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}
