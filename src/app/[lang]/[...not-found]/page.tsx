import type { LocaleType } from "@/types"

import { NotFound404 } from "@/components/pages/not-found-404"

interface NotFoundPageProps {
  params: Promise<{ lang: LocaleType }>
}

// IMPORTANT : Désactiver la génération statique
export const dynamic = "force-dynamic"
export const dynamicParams = true

export default async function NotFoundPage({ params }: NotFoundPageProps) {
  const { lang } = await params

  return <NotFound404 lang={lang} />
}
