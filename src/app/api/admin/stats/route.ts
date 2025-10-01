import { NextResponse } from "next/server"
import { createClient } from "@/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"

import { requireSuperAdmin } from "@/lib/auth/admin"

export async function GET() {
  try {
    // Vérifier les permissions super admin
    const { error } = await requireSuperAdmin()
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Récupérer les statistiques depuis les tables custom et auth.users
    const [
      { count: totalOrganizations },
      { count: totalWorkspaces },
      authUsersData,
    ] = await Promise.all([
      supabase
        .from("organizations")
        .select("*", { count: "exact", head: true }),
      supabase.from("workspaces").select("*", { count: "exact", head: true }),
      adminClient.auth.admin.listUsers(),
    ])

    if (authUsersData.error) {
      throw new Error(
        `Erreur lors de la récupération des utilisateurs: ${authUsersData.error.message}`
      )
    }

    const totalUsers = authUsersData.data.users.length

    // Calculer les utilisateurs actifs (connectés dans les 30 derniers jours)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const activeUsers = authUsersData.data.users.filter((user) => {
      if (!user.last_sign_in_at) return false
      return new Date(user.last_sign_in_at) >= thirtyDaysAgo
    }).length

    // Calculer la croissance mensuelle
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const newUsers = authUsersData.data.users.filter((user) => {
      return new Date(user.created_at) >= lastMonth
    }).length

    const [{ count: newOrganizations }, { count: newWorkspaces }] =
      await Promise.all([
        supabase
          .from("organizations")
          .select("*", { count: "exact", head: true })
          .gte("created_at", lastMonth.toISOString()),
        supabase
          .from("workspaces")
          .select("*", { count: "exact", head: true })
          .gte("created_at", lastMonth.toISOString()),
      ])

    return NextResponse.json({
      totalOrganizations: totalOrganizations || 0,
      totalWorkspaces: totalWorkspaces || 0,
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      monthlyGrowth: {
        organizations: newOrganizations || 0,
        workspaces: newWorkspaces || 0,
        users: newUsers || 0,
      },
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
