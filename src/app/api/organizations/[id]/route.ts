import { NextResponse } from "next/server"
import { createClient } from "@/supabase/server"

import type { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createClient()
    const organizationId = params.id

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Vérifier que l'utilisateur appartient à cette organisation ou est super admin
    const { data: membership } = await supabase
      .from("workspace_members")
      .select(
        `
        role,
        workspace:workspace_id (
          organization_id
        )
      `
      )
      .eq("user_id", user.id)
      .eq("workspace.organization_id", organizationId)
      .limit(1)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Récupérer les détails de l'organisation
    const { data: organization, error: orgError } = await supabase
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
        owner:owner_id (
          id,
          email,
          full_name
        )
      `
      )
      .eq("id", organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error("Error fetching organization:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createClient()
    const organizationId = params.id
    const body = await request.json()

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Vérifier que l'utilisateur est owner de cette organisation
    const { data: organization } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", organizationId)
      .single()

    if (!organization || organization.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Only organization owner can update details" },
        { status: 403 }
      )
    }

    // Mettre à jour l'organisation
    const { data: updatedOrg, error: updateError } = await supabase
      .from("organizations")
      .update({
        name: body.name,
        description: body.description || null,
        website: body.website || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating organization:", updateError)
      return NextResponse.json(
        { error: "Failed to update organization" },
        { status: 500 }
      )
    }

    return NextResponse.json({ organization: updatedOrg })
  } catch (error) {
    console.error("Error in organization update API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
