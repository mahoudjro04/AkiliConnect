import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

import type { NextRequest } from "next/server"

import { isGuestRoute, isPublicRoute } from "@/lib/auth-routes"
import {
  ensureLocalizedPathname,
  getLocaleFromPathname,
  getPreferredLocale,
  isPathnameMissingLocale,
} from "@/lib/i18n"
import { ensureRedirectPathname, ensureWithoutPrefix } from "@/lib/utils"

function redirect(pathname: string, request: NextRequest) {
  const { search, hash } = request.nextUrl
  let resolvedPathname = pathname

  if (isPathnameMissingLocale(pathname)) {
    const preferredLocale = getPreferredLocale(request)
    resolvedPathname = ensureLocalizedPathname(pathname, preferredLocale)
  }
  if (search) {
    resolvedPathname += search
  }
  if (hash) {
    resolvedPathname += hash
  }

  const redirectUrl = new URL(resolvedPathname, request.url).toString()
  return NextResponse.redirect(redirectUrl)
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log(pathname)
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const locale = getLocaleFromPathname(pathname)
  const pathnameWithoutLocale = ensureWithoutPrefix(pathname, `/${locale}`)
  const isNotPublic = !isPublicRoute(pathnameWithoutLocale)

  // Handle authentication for protected and guest routes
  if (isNotPublic) {
    const isAuthenticated = !!user
    const isGuest = isGuestRoute(pathnameWithoutLocale)
    const isProtected = !isGuest

    // Redirect authenticated users away from guest routes
    if (isAuthenticated && isGuest) {
      return redirect(process.env.HOME_PATHNAME || "/en", request)
    }

    // Redirect unauthenticated users from protected routes to sign-in
    if (!isAuthenticated && isProtected) {
      // Use absolute API path to avoid creating '/./api/...' when localizing
      let redirectPathname = "/api/auth/sign-in"

      // Maintain the original path for redirection
      if (pathnameWithoutLocale !== "") {
        redirectPathname = ensureRedirectPathname(redirectPathname, pathname)
      }

      return redirect(redirectPathname, request)
    }
  }

  // Redirect to localized URL if the pathname is missing a locale
  if (!locale) {
    return redirect(pathname, request)
  }

  /**
   * NOTE
   * If your homepage is not '/', you need to configure a redirect
   * in next.config.mjs using the redirects() function,
   * and set the HOME_PATHNAME environment variable accordingly.
   *
   * See https://nextjs.org/docs/app/building-your-application/routing/redirecting#redirects-in-nextconfigjs
   */

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!
  return supabaseResponse
}
