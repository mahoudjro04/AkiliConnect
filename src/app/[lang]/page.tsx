import { redirect } from "next/navigation"
import { createClient } from "@/supabase/server"

export default async function HomePage({
  params,
}: {
  params: { lang: string }
}) {
  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      // If the user is logged in, redirect to the workspace
      redirect(`/${params.lang}/workspace`)
    } else {
      // If the user is not logged in, redirect to the landing page
      redirect(`/${params.lang}/pages/landing`)
    }
  } catch (_error) {
    // If there is an error, redirect to the login page
    redirect(`/${params.lang}/sign-in`)
  }
  return null
}
