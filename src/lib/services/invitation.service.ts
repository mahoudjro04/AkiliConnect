import { randomBytes } from "crypto"

import type {
  UserRole,
  Workspace,
  WorkspaceInvitation,
} from "@/types/multi-tenant"

import { TABLES, supabase, supabaseAdmin } from "@/lib/database/config"

// ============================================================================
// SERVICE D'INVITATION
// ============================================================================

export class InvitationService {
  // Créer une invitation
  static async createInvitation(
    workspaceId: string,
    email: string,
    role: UserRole,
    invitedBy: string
  ): Promise<WorkspaceInvitation | null> {
    if (!supabaseAdmin) {
      throw new Error("Admin client not available")
    }

    // Générer un token unique
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expire dans 7 jours

    try {
      // Vérifier que l'email n'est pas déjà invité ou membre
      const { data: existingMember } = await supabase
        .from(TABLES.WORKSPACE_MEMBERS)
        .select("user:users(email)")
        .eq("workspace_id", workspaceId)
        .single()

      if (
        existingMember &&
        existingMember.user &&
        "email" in existingMember.user &&
        existingMember.user.email === email
      ) {
        throw new Error("User is already a member of this workspace")
      }

      const { data: existingInvitation } = await supabase
        .from(TABLES.WORKSPACE_INVITATIONS)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("email", email)
        .is("accepted_at", null)
        .single()

      if (existingInvitation) {
        throw new Error("User has already been invited to this workspace")
      }

      // Créer l'invitation
      const { data, error } = await supabaseAdmin
        .from(TABLES.WORKSPACE_INVITATIONS)
        .insert({
          workspace_id: workspaceId,
          email,
          role,
          invited_by: invitedBy,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select(
          `
          *,
          workspace:workspaces(*),
          inviter:users!workspace_invitations_invited_by_fkey(*)
        `
        )
        .single()

      if (error) {
        console.error("Failed to create invitation:", error)
        return null
      }

      return data as WorkspaceInvitation
    } catch (error) {
      console.error("Error creating invitation:", error)
      if (error instanceof Error) {
        throw error
      }
      return null
    }
  }

  // Récupérer une invitation par token
  static async getInvitationByToken(
    token: string
  ): Promise<WorkspaceInvitation | null> {
    const { data, error } = await supabase
      .from(TABLES.WORKSPACE_INVITATIONS)
      .select(
        `
        *,
        workspace:workspaces!inner(
          *,
          organization:organizations(*)
        ),
        inviter:users!workspace_invitations_invited_by_fkey(*)
      `
      )
      .eq("token", token)
      .is("accepted_at", null)
      .single()

    if (error || !data) {
      return null
    }

    // Vérifier que l'invitation n'a pas expiré
    const now = new Date()
    const expiresAt = new Date(data.expires_at)

    if (now > expiresAt) {
      return null
    }

    return data as WorkspaceInvitation
  }

  // Accepter une invitation
  static async acceptInvitation(
    token: string,
    userId: string
  ): Promise<{ success: boolean; workspace?: Workspace; error?: string }> {
    if (!supabaseAdmin) {
      throw new Error("Admin client not available")
    }

    try {
      // Récupérer l'invitation
      const invitation = await this.getInvitationByToken(token)

      if (!invitation) {
        return { success: false, error: "Invalid or expired invitation" }
      }

      // Vérifier que l'utilisateur n'est pas déjà membre
      const { data: existingMember } = await supabase
        .from(TABLES.WORKSPACE_MEMBERS)
        .select("id")
        .eq("user_id", userId)
        .eq("workspace_id", invitation.workspaceId)
        .single()

      if (existingMember) {
        return {
          success: false,
          error: "User is already a member of this workspace",
        }
      }

      // Transaction : Ajouter le membre et marquer l'invitation comme acceptée
      const now = new Date().toISOString()

      // Ajouter l'utilisateur au workspace
      const { error: memberError } = await supabaseAdmin
        .from(TABLES.WORKSPACE_MEMBERS)
        .insert({
          user_id: userId,
          workspace_id: invitation.workspaceId,
          role: invitation.role,
          invited_by: invitation.invitedBy,
          invitation_accepted_at: now,
        })

      if (memberError) {
        console.error("Failed to add workspace member:", memberError)
        return { success: false, error: "Failed to join workspace" }
      }

      // Marquer l'invitation comme acceptée
      const { error: invitationError } = await supabaseAdmin
        .from(TABLES.WORKSPACE_INVITATIONS)
        .update({ accepted_at: now })
        .eq("token", token)

      if (invitationError) {
        console.error("Failed to update invitation:", invitationError)
        // Note: L'utilisateur est déjà ajouté, on continue
      }

      return {
        success: true,
        workspace: invitation.workspace,
      }
    } catch (error) {
      console.error("Error accepting invitation:", error)
      return { success: false, error: "Internal server error" }
    }
  }

  // Annuler une invitation
  static async cancelInvitation(
    token: string,
    userId: string
  ): Promise<boolean> {
    if (!supabaseAdmin) {
      throw new Error("Admin client not available")
    }

    // Vérifier que l'utilisateur a le droit d'annuler cette invitation
    const { data: invitation } = await supabase
      .from(TABLES.WORKSPACE_INVITATIONS)
      .select("invited_by, workspace_id")
      .eq("token", token)
      .single()

    if (!invitation) {
      return false
    }

    // Vérifier les permissions (seul l'inviteur ou un owner/admin peut annuler)
    if (invitation.invited_by !== userId) {
      const { data: member } = await supabase
        .from(TABLES.WORKSPACE_MEMBERS)
        .select("role")
        .eq("user_id", userId)
        .eq("workspace_id", invitation.workspace_id)
        .single()

      if (!member || (member.role !== "owner" && member.role !== "admin")) {
        return false
      }
    }

    // Supprimer l'invitation
    const { error } = await supabaseAdmin
      .from(TABLES.WORKSPACE_INVITATIONS)
      .delete()
      .eq("token", token)

    return !error
  }

  // Lister les invitations d'un workspace
  static async getWorkspaceInvitations(
    workspaceId: string
  ): Promise<WorkspaceInvitation[]> {
    const { data, error } = await supabase
      .from(TABLES.WORKSPACE_INVITATIONS)
      .select(
        `
        *,
        inviter:users!workspace_invitations_invited_by_fkey(*)
      `
      )
      .eq("workspace_id", workspaceId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch workspace invitations:", error)
      return []
    }

    return data as WorkspaceInvitation[]
  }

  // Envoyer l'email d'invitation (placeholder)
  static async sendInvitationEmail(
    invitation: WorkspaceInvitation
  ): Promise<boolean> {
    // TODO: Implémenter l'envoi d'email avec un service comme Resend ou SendGrid
    console.log("Invitation email would be sent to:", invitation.email)
    console.log(
      "Invitation link:",
      `${process.env.NEXT_PUBLIC_APP_URL}/invitations/${invitation.token}`
    )

    // Pour le moment, on log juste l'information
    return true
  }
}
