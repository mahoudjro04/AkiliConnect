import { NextResponse } from "next/server"
import { createClient } from "@/supabase/server"

import type { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createClient()
    const organizationId = params.id

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Vérifier que l'utilisateur appartient à cette organisation
    const { data: membership } = await supabase
      .from("workspace_members")
      .select(
        `
        workspace:workspace_id (
          organization_id
        )
      `
      )
      .eq("user_id", user.id)
      .eq("workspace.organization_id", organizationId)
      .limit(1)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Récupérer les statistiques de l'organisation
    const [
      { count: totalWorkspaces },
      { count: totalMembers },
      { data: organization },
    ] = await Promise.all([
      supabase
        .from("workspaces")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .in(
          "workspace_id",
          (
            await supabase
              .from("workspaces")
              .select("id")
              .eq("organization_id", organizationId)
          ).data?.map((w: { id: string }) => w.id) || []
        ),
      supabase
        .from("organizations")
        .select("created_at")
        .eq("id", organizationId)
        .single(),
    ])

    return NextResponse.json({
      totalWorkspaces: totalWorkspaces || 0,
      totalMembers: totalMembers || 0,
      createdAt: organization?.created_at || new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching organization stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
