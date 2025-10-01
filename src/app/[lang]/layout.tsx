import { Cairo, Poppins, Roboto } from "next/font/google"

import { i18n } from "@/configs/i18n"
import { cn } from "@/lib/utils"

import "../globals.css"

import { Providers } from "@/providers"

import type { LocaleType } from "@/types"
import type { Metadata } from "next"
import type { ReactNode } from "react"

import { AuthProvider } from "@/hooks/use-auth"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { Toaster } from "@/components/ui/toaster"

// Define metadata for the application
// More info: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
export const metadata: Metadata = {
  title: {
    template: "%s | AkiliConnect",
    default: "AkiliConnect",
  },
  description: "",
  metadataBase: new URL(process.env.BASE_URL as string),
}

// Define fonts for the application
// More info: https://nextjs.org/docs/app/building-your-application/optimizing/fonts
const robotoFont = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
})

const poppinsFont = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

const cairoFont = Cairo({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-cairo",
  display: "swap",
})

export default async function RootLayout(props: {
  children: ReactNode
  params: Promise<{ lang: LocaleType }>
}) {
  const params = await props.params
  const { children } = props
  const direction = i18n.localeDirection[params.lang]

  return (
    <html lang={params.lang} dir={direction} suppressHydrationWarning>
      <body
        className={cn(
          "[&:lang(en)]:font-roboto [&:lang(fr)]:font-poppins [&:lang(ar)]:font-cairo",
          robotoFont.variable,
          poppinsFont.variable,
          cairoFont.variable
        )}
      >
        <Providers locale={params.lang} direction={direction}>
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
          <Sonner />
        </Providers>
      </body>
    </html>
  )
}
