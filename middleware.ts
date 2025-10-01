import { NextResponse } from "next/server"
import { updateSession } from "@/supabase/middleware"

import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Rediriger la racine vers /en/sign-in
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/en/sign-in", request.url))
  }

  // Rediriger /en vers /en/sign-in pour éviter les boucles
  if (request.nextUrl.pathname === "/en") {
    return NextResponse.redirect(new URL("/en/sign-in", request.url))
  }

  // update user's auth session pour les autres routes
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
