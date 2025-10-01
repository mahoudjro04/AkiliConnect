import { NextResponse } from "next/server"
import { createClient } from "@/supabase/client"

import type { UserRole } from "@/types/multi-tenant"

import { hasPermission } from "@/lib/permissions"
import { InvitationService } from "@/lib/services/invitation.service"

// POST /api/workspaces/[workspaceId]/invitations
export async function POST(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const params = await context.params
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

    const workspaceId = params.workspaceId
    const body = await req.json()
    const { email, role, _message } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      )
    }

    if (!["admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'admin' or 'member'" },
        { status: 400 }
      )
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of this workspace" },
        { status: 403 }
      )
    }

    if (!hasPermission(membership.role as UserRole, "user", "invite")) {
      return NextResponse.json(
        { error: "Insufficient permissions to invite users" },
        { status: 403 }
      )
    }

    const invitation = await InvitationService.createInvitation(
      workspaceId,
      email,
      role as UserRole,
      user.id
    )

    if (!invitation) {
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      )
    }

    await InvitationService.sendInvitationEmail(invitation)

    return NextResponse.json(
      {
        message: "Invitation sent successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error sending invitation:", error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET /api/workspaces/[workspaceId]/invitations
export async function GET(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const params = await context.params
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

    const workspaceId = params.workspaceId

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of this workspace" },
        { status: 403 }
      )
    }

    const invitations =
      await InvitationService.getWorkspaceInvitations(workspaceId)

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        inviter: inv.inviter,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching invitations:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
