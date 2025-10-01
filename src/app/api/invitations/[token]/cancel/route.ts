import { NextResponse } from "next/server"
import { createClient } from "@/supabase/server"

import type { NextRequest } from "next/server"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createClient()
    const invitationToken = params.token

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Récupérer l'invitation pour vérifier les permissions
    const { data: invitation, error: invitationError } = await supabase
      .from("workspace_invitations")
      .select(
        `
        id,
        workspace_id,
        workspace:workspace_id (
          id,
          organization_id
        )
      `
      )
      .eq("token", invitationToken)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur a les permissions d'admin/owner du workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", invitation.workspace_id)
      .eq("user_id", user.id)
      .single()

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    // Annuler l'invitation (mettre à jour le statut)
    const { error: updateError } = await supabase
      .from("workspace_invitations")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("token", invitationToken)

    if (updateError) {
      console.error("Error cancelling invitation:", updateError)
      return NextResponse.json(
        { error: "Failed to cancel invitation" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in cancel invitation API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
