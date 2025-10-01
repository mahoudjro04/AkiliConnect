import { NextResponse } from "next/server"
import { createClient } from "@/supabase/server"
import { z } from "zod"

import type { NextRequest } from "next/server"

import { WorkspaceService } from "@/lib/services/multi-tenant.service"

const BodySchema = z.object({
  role: z.enum(["owner", "admin", "member"]),
  reason: z.string().max(250).optional(),
})

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  const params = await context.params
  const { workspaceId, userId } = params
  const body = await req.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user: actor },
  } = await supabase.auth.getUser()
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Vérifier que l'acteur est membre du workspace
  const { data: actorMembership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", actor.id)
    .single()

  if (!actorMembership || !["owner", "admin"].includes(actorMembership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Empêcher un admin de promouvoir/dégrader un owner s'il n'est pas owner
  if (actorMembership.role !== "owner" && parsed.data.role === "owner") {
    return NextResponse.json(
      { error: "Only owner can assign owner role" },
      { status: 403 }
    )
  }

  // Récupérer l'ancien rôle
  const { data: targetMembership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single()
  if (!targetMembership) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 })
  }

  const oldRole = targetMembership.role
  const newRole = parsed.data.role

  if (oldRole === newRole) {
    return NextResponse.json({ message: "No change", role: newRole })
  }

  // Mise à jour
  const updated = await WorkspaceService.updateUserRole(
    workspaceId,
    userId,
    newRole
  )
  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }

  // Audit log dédié
  await supabase.from("role_change_logs").insert({
    scope: "workspace",
    workspace_id: workspaceId,
    target_user_id: userId,
    actor_user_id: actor.id,
    old_role: oldRole,
    new_role: newRole,
    reason: parsed.data.reason,
  })

  return NextResponse.json({ role: newRole, previous: oldRole })
}
