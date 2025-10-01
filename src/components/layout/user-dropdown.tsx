import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/supabase/client"
import { LogOut, Settings, Shield, User, UserCog } from "lucide-react"

import type { DictionaryType } from "@/lib/get-dictionary"
import type { LocaleType } from "@/types"

import { ensureLocalizedPathname } from "@/lib/i18n"
import { getInitials } from "@/lib/utils"

import { useUserPermissions } from "@/hooks/use-user-permissions"
import { useSupabaseSession } from "@/providers/supabase-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserDropdown({
  dictionary,
  locale,
}: {
  dictionary: DictionaryType
  locale: LocaleType
}) {
  const router = useRouter()
  const { session } = useSupabaseSession()
  const { isSuperAdmin, isOrgAdmin } = useUserPermissions()
  const user = session?.user
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-lg"
          aria-label="User"
        >
          <Avatar className="size-9">
            <AvatarImage
              src={user?.user_metadata?.avatar || undefined}
              alt=""
            />
            <AvatarFallback className="bg-transparent">
              {user?.user_metadata?.name
                ? getInitials(user.user_metadata.name)
                : user?.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent forceMount>
        <DropdownMenuLabel className="flex gap-2">
          <Avatar>
            <AvatarImage
              src={user?.user_metadata?.avatar || undefined}
              alt="Avatar"
            />
            <AvatarFallback className="bg-transparent">
              {user?.user_metadata?.name
                ? getInitials(user.user_metadata.name)
                : user?.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <p className="text-sm font-medium truncate">
              {user?.user_metadata?.name || user?.email}
            </p>
            <p className="text-xs text-muted-foreground font-semibold truncate">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Sections Admin */}
        {(isSuperAdmin || isOrgAdmin) && (
          <>
            <DropdownMenuGroup className="max-w-48">
              {isSuperAdmin && (
                <DropdownMenuItem asChild>
                  <Link href={ensureLocalizedPathname("/admin", locale)}>
                    <Shield className="me-2 size-4 text-red-500" />
                    <span className="flex items-center gap-2">
                      Admin Dashboard
                      <span className="inline-flex h-4 w-6 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-600 dark:bg-red-900 dark:text-red-300">
                        SA
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              )}

              {isOrgAdmin && !isSuperAdmin && (
                <DropdownMenuItem asChild>
                  <Link
                    href={ensureLocalizedPathname(
                      "/organization/settings",
                      locale
                    )}
                  >
                    <Settings className="me-2 size-4 text-blue-500" />
                    <span className="flex items-center gap-2">
                      Organisation
                      <span className="inline-flex h-4 w-6 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                        A
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuGroup className="max-w-48">
          <DropdownMenuItem asChild>
            <Link
              href={ensureLocalizedPathname("/pages/account/profile", locale)}
            >
              <User className="me-2 size-4" />
              {dictionary.navigation.userNav.profile}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={ensureLocalizedPathname("/pages/account/settings", locale)}
            >
              <UserCog className="me-2 size-4" />
              {dictionary.navigation.userNav.settings}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            // Redirection vers la page de connexion
            router.push(ensureLocalizedPathname("/sign-in", locale))
          }}
        >
          <LogOut className="me-2 size-4" />
          {dictionary.navigation.userNav.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
