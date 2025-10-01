import { NextResponse } from "next/server"

import { InvitationService } from "@/lib/services/invitation.service"

// GET /api/invitations/[token] - Vérifier une invitation
export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Récupérer l'invitation
    const invitation = await InvitationService.getInvitationByToken(token)

    if (!invitation) {
      return NextResponse.json(
        {
          error: "Invalid or expired invitation",
          valid: false,
        },
        { status: 404 }
      )
    }

    // Retourner les informations de l'invitation (sans le token)
    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        workspace: {
          id: invitation.workspace?.id,
          name: invitation.workspace?.name,
          organization: {
            id: invitation.workspace?.organization?.id,
            name: invitation.workspace?.organization?.name,
          },
        },
        inviter: {
          id: invitation.inviter?.id,
          firstName: invitation.inviter?.firstName,
          lastName: invitation.inviter?.lastName,
          email: invitation.inviter?.email,
        },
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
    })
  } catch (error) {
    console.error("Error verifying invitation:", error)
    return NextResponse.json(
      { error: "Internal server error", valid: false },
      { status: 500 }
    )
  }
}
