/**
 * API pour migrer les utilisateurs vers auth.users
 * POST /api/admin/migrate-users
 */

import { migrateAllUsersToAuth } from "@/lib/auth/migration-utils"

export async function POST() {
  try {
    const result = await migrateAllUsersToAuth()

    if (result.success) {
      return Response.json({
        message: "Migration des utilisateurs terminée",
        summary: result.summary,
        details: result.results,
      })
    } else {
      return Response.json({ error: result.error }, { status: 400 })
    }
  } catch (error) {
    console.error("Erreur migration API:", error)
    return Response.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}
