import { NextResponse } from "next/server"
import { createClient } from "@/supabase/server"

import type { NextRequest } from "next/server"

// GET /api/workspaces/[workspaceId]/members
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

    const { data: members, error } = await supabase
      .from("workspace_members")
      .select(
        `
        id,
        role,
        created_at,
        updated_at,
        user:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching workspace members:", error)
      return NextResponse.json(
        { error: "Failed to fetch workspace members" },
        { status: 500 }
      )
    }

    return NextResponse.json({ members })
  } catch (error) {
    console.error("Error in workspace members API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/workspaces/[workspaceId]/members?userId=...
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createClient()
    const workspaceId = params.workspaceId
    const { searchParams } = new URL(request.url)
    const memberUserId = searchParams.get("userId")

    if (!memberUserId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

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

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { data: memberToRemove } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", memberUserId)
      .single()

    if (!memberToRemove) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    if (memberToRemove.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove workspace owner" },
        { status: 400 }
      )
    }

    if (memberUserId === user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself" },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", memberUserId)

    if (deleteError) {
      console.error("Error removing workspace member:", deleteError)
      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in remove member API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
