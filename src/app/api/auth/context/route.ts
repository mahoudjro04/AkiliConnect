import { NextResponse } from "next/server"
import { createClient } from "@/supabase/client"

import { WorkspaceContextService } from "@/lib/services/multi-tenant.service"

// GET /api/auth/context - Récupérer le contexte workspace de l'utilisateur
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

    const workspaceContext =
      await WorkspaceContextService.getUserWorkspaceContext(user.id)

    return NextResponse.json({
      workspaceContext,
      hasWorkspaces: !!workspaceContext,
    })
  } catch (error) {
    console.error("Error fetching auth context:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
