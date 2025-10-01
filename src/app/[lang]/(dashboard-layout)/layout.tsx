import { redirect } from "next/navigation"
import { createClient } from "@/supabase/server"

import type { LocaleType } from "@/types"
import type { ReactNode } from "react"

import { getDictionary } from "@/lib/get-dictionary"

import { Layout } from "@/components/layout"

export default async function DashboardLayout(props: {
  children: ReactNode
  params: Promise<{ lang: LocaleType }>
}) {
  const params = await props.params
  const { children } = props
  const dictionary = await getDictionary(params.lang)

  // Vérification de l'authentification
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${params.lang}/sign-in`)
    return null
  }

  return <Layout dictionary={dictionary}>{children}</Layout>
}
