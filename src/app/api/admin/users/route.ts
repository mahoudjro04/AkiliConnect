// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/admin"

import { requireSuperAdmin } from "@/lib/auth/admin"

type AuthUser = {
  id: string
  email?: string
  created_at: string
  last_sign_in_at?: string
  app_metadata: Record<string, unknown>
}

export async function GET() {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      )
    }

    const adminClient = createAdminClient()

    const { data, error: usersError } = await adminClient.auth.admin.listUsers()

    if (usersError) {
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      )
    }

    const users = data.users.map((user: AuthUser) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      app_metadata: user.app_metadata,
    }))

    return NextResponse.json({ users, total: users.length })
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
