import { NextResponse } from "next/server"
import { createClient } from "@/supabase/server"

import type { NextRequest } from "next/server"

import { requireSuperAdmin } from "@/lib/auth/admin"

type WorkspaceData = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  organization_id: string
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier les permissions super admin
    const { error: authError } = await requireSuperAdmin()
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Récupérer les workspaces (requête simplifiée)
    const { data: workspaces, error: dbError } = await supabase
      .from("workspaces")
      .select(
        `
        id,
        name,
        description,
        created_at,
        updated_at,
        organization_id
      `
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (dbError) {
      console.error("Error fetching workspaces:", dbError)
      return NextResponse.json(
        { error: "Failed to fetch workspaces" },
        { status: 500 }
      )
    }

    if (!workspaces) {
      return NextResponse.json({ workspaces: [], total: 0 })
    }

    // Récupérer le nombre de membres pour chaque workspace
    const workspacesWithStats = await Promise.all(
      workspaces.map(async (workspace: WorkspaceData) => {
        const { count: memberCount } = await supabase
          .from("workspace_members")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspace.id)

        return {
          ...workspace,
          memberCount: memberCount || 0,
        }
      })
    )

    return NextResponse.json({
      workspaces: workspacesWithStats,
      total: workspacesWithStats.length,
    })
  } catch (error) {
    console.error("Error in admin workspaces API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
