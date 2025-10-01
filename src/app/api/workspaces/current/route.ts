import { NextResponse } from "next/server"
import { createClient } from "@/supabase/client"

import {
  WorkspaceContextService,
  WorkspaceService,
} from "@/lib/services/multi-tenant.service"

// GET /api/workspaces/current - Récupérer le workspace actuel avec ses détails
export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Récupérer le contexte workspace actuel
    const context = await WorkspaceContextService.getUserWorkspaceContext(
      user.id
    )

    if (!context) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 })
    }

    // Récupérer les détails du workspace
    const workspace = await WorkspaceService.getById(context.currentWorkspaceId)
    const members = await WorkspaceService.getWorkspaceMembers(
      context.currentWorkspaceId
    )

    // TODO: Récupérer les statistiques réelles (bots, knowledge bases, etc.)
    // Pour l'instant, on retourne des valeurs par défaut
    const stats = {
      bots: 0,
      knowledgeBases: 0,
      activeMembers: members.length,
    }

    return NextResponse.json({
      workspace,
      members,
      stats,
      context,
    })
  } catch (error) {
    console.error("Error fetching current workspace:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
