import { NextResponse } from "next/server"
import { createClient } from "@/supabase/server"

import type { NextRequest } from "next/server"

// GET /api/workspaces/[workspaceId]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createClient()
    const workspaceId = params.workspaceId

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select(
        `
        id,
        name,
        description,
        organization_id,
        created_at,
        updated_at
      `
      )
      .eq("id", workspaceId)
      .single()

    if (error || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ workspace })
  } catch (error) {
    console.error("Error fetching workspace:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
