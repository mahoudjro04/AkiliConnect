import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { createClient } from "@/supabase/server"

import type { NextRequest } from "next/server"

import { getLocaleFromPathname, getPreferredLocale } from "@/lib/i18n"

// Déconnexion via POST (recommandé) : supprime la session côté serveur puis redirige vers la page de connexion localisée
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Récupérer user (même si non utilisé après, nécessaire pour que Supabase attache les bons cookies au contexte)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  // Détermination de la locale pour la redirection
  const referer = req.headers.get("referer") || ""
  const refererUrl = (() => {
    try {
      return referer ? new URL(referer) : null
    } catch {
      return null
    }
  })()

  let locale = refererUrl ? getLocaleFromPathname(refererUrl.pathname) : null
  if (!locale) {
    // fallback sur préférence navigateur / config
    locale = getPreferredLocale(req)
  }
  if (!locale) {
    locale = "en"
  }

  // Invalider le layout racine + layout localisé (si applicable) pour purger l'état user
  revalidatePath("/", "layout")
  revalidatePath(`/${locale}`, "layout")

  // IMPORTANT : rediriger vers la route sign-in localisée
  const redirectUrl = new URL(`/${locale}/sign-in`, req.url)
  return NextResponse.redirect(redirectUrl, { status: 302 })
}

// Optionnel : permettre aussi une déconnexion via GET (ex: lien <a>)
export async function GET(req: NextRequest) {
  return POST(req)
}
