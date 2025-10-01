"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Settings, Shield } from "lucide-react"

import type { LocaleType } from "@/types"

import { ensureLocalizedPathname } from "@/lib/i18n"

import { useUserPermissions } from "@/hooks/use-user-permissions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function AdminAccessButtons() {
  const params = useParams()
  const { isSuperAdmin, isOrgAdmin, loading } = useUserPermissions()
  const locale = params.lang as LocaleType

  if (loading) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Bouton Super Admin Dashboard */}
        {isSuperAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild size="sm" className="relative" variant="outline">
                <Link href={ensureLocalizedPathname("/admin", locale)}>
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Dashboard
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
                  >
                    SA
                  </Badge>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Accès Super Administrateur</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Bouton Admin Organisation */}
        {isOrgAdmin && !isSuperAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild size="sm" className="relative" variant="outline">
                <Link
                  href={ensureLocalizedPathname(
                    "/organization/settings",
                    locale
                  )}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Org Settings
                  <Badge
                    variant="secondary"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
                  >
                    A
                  </Badge>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Administration Organisation</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
