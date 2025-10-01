"use client"

import { useEffect, useState } from "react"

import type { User } from "@supabase/supabase-js"

import { useWorkspace } from "./use-auth"

interface UserPermissions {
  isSuperAdmin: boolean
  isOrgAdmin: boolean
  isWorkspaceAdmin: boolean
  isWorkspaceOwner: boolean
  canAccessAdminDashboard: boolean
  canAccessOrgSettings: boolean
  platformRole: string | null
  workspaceRole: string | null
}

export function useUserPermissions(): UserPermissions & { loading: boolean } {
  const { user, currentRole } = useWorkspace()
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<UserPermissions>({
    isSuperAdmin: false,
    isOrgAdmin: false,
    isWorkspaceAdmin: false,
    isWorkspaceOwner: false,
    canAccessAdminDashboard: false,
    canAccessOrgSettings: false,
    platformRole: null,
    workspaceRole: null,
  })

  useEffect(() => {
    if (user) {
      const isSuperAdmin = checkSuperAdminStatus(user)
      const isWorkspaceOwner = currentRole === "owner"
      const isWorkspaceAdmin = currentRole === "admin" || isWorkspaceOwner
      const isOrgAdmin = isWorkspaceAdmin || isSuperAdmin

      setPermissions({
        isSuperAdmin,
        isOrgAdmin,
        isWorkspaceAdmin,
        isWorkspaceOwner,
        canAccessAdminDashboard: isSuperAdmin,
        canAccessOrgSettings: isOrgAdmin,
        platformRole: user.app_metadata?.platform_role || null,
        workspaceRole: currentRole || null,
      })
    } else {
      setPermissions({
        isSuperAdmin: false,
        isOrgAdmin: false,
        isWorkspaceAdmin: false,
        isWorkspaceOwner: false,
        canAccessAdminDashboard: false,
        canAccessOrgSettings: false,
        platformRole: null,
        workspaceRole: null,
      })
    }
    setLoading(false)
  }, [user, currentRole])

  return { ...permissions, loading }
}

// Fonction helper pour vérifier le statut super admin
function checkSuperAdminStatus(user: User): boolean {
  // Vérifier via app_metadata.platform_role
  if (user.app_metadata?.platform_role === "super_admin") {
    return true
  }

  // Vérifier via is_super_admin (si disponible)
  const userWithFlags = user as User & { is_super_admin?: boolean }
  if (userWithFlags.is_super_admin === true) {
    return true
  }

  return false
}
