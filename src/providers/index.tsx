import type { DirectionType, LocaleType } from "@/types"
import type { ReactNode } from "react"

import { SettingsProvider } from "@/contexts/settings-context"
import { SidebarProvider } from "@/components/ui/sidebar"
import { DirectionProvider } from "./direction-provider"
import { ModeProvider } from "./mode-provider"
import { SupabaseProvider } from "./supabase-provider"
import { ThemeProvider } from "./theme-provider"

interface ProvidersProps {
  locale: LocaleType
  direction: DirectionType
  children: ReactNode
}

export function Providers({ locale, direction, children }: ProvidersProps) {
  return (
    <SettingsProvider locale={locale}>
      <ModeProvider>
        <ThemeProvider>
          <DirectionProvider direction={direction}>
            <SupabaseProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </SupabaseProvider>
          </DirectionProvider>
        </ThemeProvider>
      </ModeProvider>
    </SettingsProvider>
  )
}
