import { NextResponse } from "next/server"
import { createClient } from "@/supabase/client"

import { WorkspaceService } from "@/lib/services/multi-tenant.service"

// GET /api/workspaces - Récupérer les workspaces de l'utilisateur
export async function GET() {
  try {
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

    const workspaces = await WorkspaceService.getUserWorkspaces(user.id)

    return NextResponse.json({
      workspaces,
      total: workspaces.length,
    })
  } catch (error) {
    console.error("Error fetching workspaces:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/workspaces - Créer un nouveau workspace
export async function POST(req: Request) {
  try {
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

    const body = await req.json()
    const { name, organizationId, description, slug } = body

    // Validation basique
    if (!name || !organizationId) {
      return NextResponse.json(
        { error: "Name and organizationId are required" },
        { status: 400 }
      )
    }

    // Générer un slug si non fourni
    const workspaceSlug = slug || name.toLowerCase().replace(/\s+/g, "-")

    const workspace = await WorkspaceService.create(
      {
        organizationId,
        name,
        slug: workspaceSlug,
        description,
      },
      user.id
    )

    if (!workspace) {
      return NextResponse.json(
        { error: "Failed to create workspace" },
        { status: 500 }
      )
    }

    return NextResponse.json({ workspace }, { status: 201 })
  } catch (error) {
    console.error("Error creating workspace:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
