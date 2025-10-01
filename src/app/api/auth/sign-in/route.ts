import { NextResponse } from "next/server"
import { createClient } from "@/supabase/client"

import { SignInSchema } from "@/schemas/sign-in-schema"

import {
  UserService,
  WorkspaceContextService,
} from "@/lib/services/multi-tenant.service"

export async function POST(req: Request) {
  const body = await req.json()
  const parsedData = SignInSchema.safeParse(body)

  if (!parsedData.success) {
    return NextResponse.json(parsedData.error, { status: 400 })
  }

  const { email, password } = parsedData.data

  try {
    // 1. Authentification Supabase
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { message: error.message, email },
        { status: 401 }
      )
    }

    // 2. Récupérer ou créer les informations utilisateur dans notre système
    let user = await UserService.getById(data.user.id)

    if (!user) {
      // Créer l'utilisateur s'il n'existe pas encore
      const metadata = data.user.user_metadata || {}
      user = await UserService.createOrUpdate({
        id: data.user.id,
        email: data.user.email!,
        firstName: metadata.first_name || metadata.firstName,
        lastName: metadata.last_name || metadata.lastName,
        username: metadata.username,
        avatarUrl: metadata.avatar_url,
      })
    }

    // 3. Récupérer le contexte workspace de l'utilisateur
    const workspaceContext =
      await WorkspaceContextService.getUserWorkspaceContext(data.user.id)

    // 4. Retourner les informations complètes
    return NextResponse.json(
      {
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          username: user?.username,
          avatarUrl: user?.avatarUrl,
          user_metadata: data.user.user_metadata,
        },
        workspaceContext,
        hasWorkspaces: !!workspaceContext,
      },
      { status: 200 }
    )
  } catch (e) {
    console.error("Error signing in:", e)
    return NextResponse.json({ error: "Error signing in" }, { status: 500 })
  }
}
