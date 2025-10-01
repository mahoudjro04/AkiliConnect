import type { NavigationType } from "@/types"
import type { UserRole } from "@/types/multi-tenant"

// Navigation de base pour tous les utilisateurs
export const baseNavigations: NavigationType[] = [
  {
    title: "Workspace",
    items: [
      {
        title: "Workspace",
        href: "/workspace",
        iconName: "Building2",
      },
      {
        title: "Members",
        href: "/members",
        iconName: "Users",
      },
    ],
  },
]

// Navigation pour les administrateurs d'organisation
export const orgAdminNavigations: NavigationType[] = [
  {
    title: "Organization",
    items: [
      {
        title: "Settings",
        href: "/organization/settings",
        iconName: "Settings",
      },
      {
        title: "Workspaces",
        href: "/organization/workspaces",
        iconName: "Building2",
      },
    ],
  },
]

// Navigation pour les super administrateurs
export const superAdminNavigations: NavigationType[] = [
  {
    title: "Administration",
    items: [
      {
        title: "Dashboard",
        href: "/admin",
        iconName: "Shield",
      },
      {
        title: "Organizations",
        href: "/admin/organizations",
        iconName: "Building2",
      },
      {
        title: "Users",
        href: "/admin/users",
        iconName: "Users",
      },
      {
        title: "Workspaces",
        href: "/admin/workspaces",
        iconName: "Briefcase",
      },
      {
        title: "System Settings",
        href: "/admin/settings",
        iconName: "Cog",
      },
    ],
  },
]

// Fonction pour générer les navigations selon le rôle
export function getNavigationsByRole(
  userRole?: UserRole,
  isOrgAdmin?: boolean,
  isSuperAdmin?: boolean
): NavigationType[] {
  let navigations: NavigationType[] = [...baseNavigations]

  // Ajouter les navigations pour les administrateurs d'organisation
  if (isOrgAdmin || userRole === "owner" || userRole === "admin") {
    navigations = [...navigations, ...orgAdminNavigations]
  }

  // Ajouter les navigations pour les super administrateurs
  if (isSuperAdmin) {
    navigations = [...navigations, ...superAdminNavigations]
  }

  return navigations
}

// Fonction pour vérifier si l'utilisateur est administrateur d'organisation
export function isOrganizationAdmin(userRole?: UserRole): boolean {
  return userRole === "owner" || userRole === "admin"
}

// Fonction pour vérifier si l'utilisateur est super administrateur
export function isSuperAdministrator(user?: {
  app_metadata?: { platform_role?: string }
  is_super_admin?: boolean
}): boolean {
  // Vérifier via app_metadata.platform_role ou is_super_admin
  if (!user) return false

  return (
    user.app_metadata?.platform_role === "super_admin" ||
    user.is_super_admin === true
  )
}
