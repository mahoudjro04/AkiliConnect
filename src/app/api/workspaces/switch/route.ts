import { NextResponse } from "next/server"
import { createClient } from "@/supabase/client"

import { WorkspaceContextService } from "@/lib/services/multi-tenant.service"

// POST /api/workspaces/switch - Changer de workspace actuel
export async function POST(req: Request) {
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

    const body = await req.json()
    const { workspaceId } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      )
    }

    // Changer le contexte workspace
    const newContext = await WorkspaceContextService.switchWorkspace(
      user.id,
      workspaceId
    )

    if (!newContext) {
      return NextResponse.json(
        { error: "Access denied or workspace not found" },
        { status: 403 }
      )
    }

    return NextResponse.json({
      workspaceContext: newContext,
      message: "Workspace switched successfully",
    })
  } catch (error) {
    console.error("Error switching workspace:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
