import type { LocaleType } from "@/types"

import { NotFound404 } from "@/components/pages/not-found-404"

interface NotFound404PageProps {
  params: Promise<{ lang: LocaleType }>
}

export default async function NotFound404Page({
  params,
}: NotFound404PageProps) {
  const { lang } = await params

  return <NotFound404 lang={lang} />
}
