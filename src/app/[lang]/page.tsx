import { redirect } from "next/navigation"
import { createClient } from "@/supabase/server"

import type { LocaleType } from "@/types"

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: LocaleType }>
}) {
  const { lang } = await params
  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      // If the user is logged in, redirect to the workspace
      redirect(`/${lang}/workspace`)
    } else {
      // If the user is not logged in, redirect to the landing page
      redirect(`/${lang}/pages/landing`)
    }
  } catch (_error) {
    // If there is an error, redirect to the login page
    redirect(`/${lang}/sign-in`)
  }
  return null
}
