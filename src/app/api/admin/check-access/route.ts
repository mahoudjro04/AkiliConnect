import { NextResponse } from "next/server"

import { requireSuperAdmin } from "@/lib/auth/admin"

// GET /api/admin/check-access - Vérifier l'accès super admin
export async function GET() {
  const { user, error } = await requireSuperAdmin()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  return NextResponse.json({
    hasAccess: true,
    userId: user?.id,
    message: "Super admin access verified",
  })
}
