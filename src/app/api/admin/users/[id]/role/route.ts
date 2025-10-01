import { NextResponse } from "next/server"
import { createClient } from "@/supabase/server"
import { z } from "zod"

import type { NextRequest } from "next/server"

import { UserService } from "@/lib/services/multi-tenant.service"

const BodySchema = z.object({
  role: z.enum(["owner", "admin", "member"]).or(z.string()), // platform role could differ
})

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const { id } = params

  const body = await req.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Vérifier que l'appelant est super admin (ou owner plateforme selon ta logique)
  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .single()

  if (caller?.role !== "owner" && caller?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const ok = await UserService.updatePlatformRole(id, parsed.data.role)
  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }

  return NextResponse.json({ id, role: parsed.data.role })
}
