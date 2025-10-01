import { NextResponse } from "next/server"
import { createClient } from "@/supabase/server"

import type { EmailOtpType } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"

/**
 * Route de confirmation / vérification Supabase.
 * Gère plusieurs cas d'OTP email : signup, magiclink, recovery (reset password), invite, email_change.
 * Améliorations :
 *  - Détection du type de flux
 *  - Redirection spécifique pour recovery vers une page de ré-initialisation du mot de passe
 *  - Paramètre de langue (fallback en)
 *  - Nettoyage sécurisé des query params sensibles
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const { searchParams } = url

  const token_hash = searchParams.get("token_hash")
  const type = (searchParams.get("type") as EmailOtpType | null) || null
  const lang = searchParams.get("lang") || "en"

  // Cibles de redirection par défaut
  const DASHBOARD_PATH = `/${lang}/workspace`
  const RESET_PASSWORD_PATH = `/${lang}/new-password`
  const EMAIL_VERIFIED_PATH = `/${lang}/auth/verified`

  // Préparer une URL de redirection de base (on clonera ensuite si besoin)
  const baseRedirect = request.nextUrl.clone()
  baseRedirect.searchParams.delete("token_hash")
  baseRedirect.searchParams.delete("type")
  baseRedirect.searchParams.delete("lang")

  // Vérification minimale des paramètres
  if (!token_hash || !type) {
    baseRedirect.pathname = "/error"
    baseRedirect.searchParams.set("code", "missing_params")
    return NextResponse.redirect(baseRedirect)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  })

  if (error) {
    baseRedirect.pathname = "/error"
    baseRedirect.searchParams.set("code", error.name || "verification_failed")
    return NextResponse.redirect(baseRedirect)
  }

  // Succès : router selon le type de flux
  const successRedirect = request.nextUrl.clone()
  // Vider proprement les search params (URLSearchParams n'a pas clear() typé ici)
  for (const key of [...successRedirect.searchParams.keys()]) {
    successRedirect.searchParams.delete(key)
  }

  switch (type) {
    case "recovery":
      // L'utilisateur est maintenant authentifié -> afficher le formulaire de nouveau mot de passe
      successRedirect.pathname = RESET_PASSWORD_PATH
      break
    case "signup":
    case "invite":
    case "magiclink":
    case "email_change":
    default:
      // Redirection vers une page de confirmation ou directement le dashboard
      successRedirect.pathname = EMAIL_VERIFIED_PATH
      break
  }

  // Fallback de sécurité si quelque chose manque
  if (!successRedirect.pathname) {
    successRedirect.pathname = DASHBOARD_PATH
  }

  return NextResponse.redirect(successRedirect)
}
