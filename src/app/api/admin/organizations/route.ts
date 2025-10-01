import { NextResponse } from "next/server"
import { createClient } from "@/supabase/server"

import type { NextRequest } from "next/server"

import { requireSuperAdmin } from "@/lib/auth/admin"

type OrganizationData = {
  id: string
  name: string
  description: string | null
  website: string | null
  status: string
  created_at: string
  updated_at: string
  owner_id: string
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier les permissions super admin
    const { error: authError } = await requireSuperAdmin()
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Récupérer les organisations (requête simplifiée)
    const { data: organizations, error: dbError } = await supabase
      .from("organizations")
      .select(
        `
        id,
        name,
        description,
        website,
        status,
        created_at,
        updated_at,
        owner_id
      `
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (dbError) {
      console.error("Error fetching organizations:", dbError)
      return NextResponse.json(
        { error: "Failed to fetch organizations" },
        { status: 500 }
      )
    }

    if (!organizations) {
      return NextResponse.json({ organizations: [], total: 0 })
    }

    // Récupérer le nombre de workspaces et de membres pour chaque organisation
    const organizationsWithStats = await Promise.all(
      organizations.map(async (org: OrganizationData) => {
        const [{ count: workspaceCount }, { count: memberCount }] =
          await Promise.all([
            supabase
              .from("workspaces")
              .select("*", { count: "exact", head: true })
              .eq("organization_id", org.id),
            supabase
              .from("workspace_members")
              .select("*", { count: "exact", head: true })
              .in(
                "workspace_id",
                (
                  await supabase
                    .from("workspaces")
                    .select("id")
                    .eq("organization_id", org.id)
                ).data?.map((w: { id: string }) => w.id) || []
              ),
          ])

        return {
          ...org,
          workspaceCount: workspaceCount || 0,
          totalMembers: memberCount || 0,
        }
      })
    )

    return NextResponse.json({
      organizations: organizationsWithStats,
      total: organizationsWithStats.length,
    })
  } catch (error) {
    console.error("Error in admin organizations API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
