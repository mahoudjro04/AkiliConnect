"use client"

import { useEffect } from "react"

interface HtmlAttributesProps {
  lang: string
  dir: "ltr" | "rtl"
}

export function HtmlAttributes({ lang, dir }: HtmlAttributesProps) {
  useEffect(() => {
    // Définir les attributs sur l'élément HTML
    document.documentElement.setAttribute("lang", lang)
    document.documentElement.setAttribute("dir", dir)
    return () => {
      // Nettoyer si nécessaire
      document.documentElement.removeAttribute("lang")
      document.documentElement.removeAttribute("dir")
    }
  }, [lang, dir])

  return null
}
