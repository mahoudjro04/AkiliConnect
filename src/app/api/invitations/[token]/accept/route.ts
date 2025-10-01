import { NextResponse } from "next/server"
import { createClient } from "@/supabase/client"

import { InvitationService } from "@/lib/services/invitation.service"

// POST /api/invitations/[token]/accept - Accepter une invitation
export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> }
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

    const token = params.token

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Vérifier que l'invitation est valide avant d'accepter
    const invitation = await InvitationService.getInvitationByToken(token)

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      )
    }

    // Vérifier que l'email de l'invitation correspond à l'utilisateur connecté
    if (invitation.email !== user.email) {
      return NextResponse.json(
        {
          error: "This invitation was sent to a different email address",
          invitationEmail: invitation.email,
          userEmail: user.email,
        },
        { status: 403 }
      )
    }

    // Accepter l'invitation
    const result = await InvitationService.acceptInvitation(token, user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to accept invitation" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: "Invitation accepted successfully",
      workspace: {
        id: result.workspace?.id,
        name: result.workspace?.name,
        organization: {
          id: result.workspace?.organization?.id,
          name: result.workspace?.organization?.name,
        },
      },
      role: invitation.role,
    })
  } catch (error) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
