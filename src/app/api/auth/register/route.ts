import { NextResponse } from "next/server"
import { createClient } from "@/supabase/client"

import { RegisterSchema } from "@/schemas/register-schema"

import { OnboardingService } from "@/lib/services/multi-tenant.service"

export async function POST(req: Request) {
  const body = await req.json()
  const parsedData = RegisterSchema.safeParse(body)

  if (!parsedData.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsedData.error },
      { status: 400 }
    )
  }

  const { firstName, lastName, username, email, password } = parsedData.data

  try {
    // 1. Créer le compte utilisateur avec Supabase Auth
    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          username,
        },
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      )
    }

    // 2. Onboarding automatique : créer organisation + workspace
    const onboardingResult = await OnboardingService.createUserWithOrganization(
      {
        id: authData.user.id,
        email,
        firstName,
        lastName,
        organizationName: `${firstName} ${lastName}'s Organization`,
      }
    )

    if (!onboardingResult) {
      // Si l'onboarding échoue, log l'erreur mais ne pas échouer l'inscription
      console.error("Onboarding failed for user:", authData.user.id)

      return NextResponse.json({
        message: "Account created successfully. Please verify your email.",
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        onboarding_completed: false,
      })
    }

    // 3. Succès complet
    return NextResponse.json({
      message: "Account created successfully. Please verify your email.",
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      organization: {
        id: onboardingResult.organization.id,
        name: onboardingResult.organization.name,
      },
      workspace: {
        id: onboardingResult.workspace.id,
        name: onboardingResult.workspace.name,
      },
      onboarding_completed: true,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    )
  }
}
