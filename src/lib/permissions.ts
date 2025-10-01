import type { UserRole } from "@/types/multi-tenant"

// Permissions par rôle et action
const ROLE_PERMISSIONS = {
  owner: {
    workspace: ["create", "read", "update", "delete"],
    bot: ["create", "read", "update", "delete"],
    knowledgeBase: ["create", "read", "update", "delete"],
    user: ["invite", "read", "update", "delete"],
    organization: ["read", "update"],
  },
  admin: {
    workspace: ["read", "update"],
    bot: ["create", "read", "update", "delete"],
    knowledgeBase: ["create", "read", "update", "delete"],
    user: ["invite", "read", "update"],
    organization: ["read"],
  },
  member: {
    workspace: ["read"],
    bot: ["read"],
    knowledgeBase: ["read"],
    user: ["read"],
    organization: ["read"],
  },
} as const

export function hasPermission(
  userRole: UserRole,
  resource: keyof typeof ROLE_PERMISSIONS.owner,
  action: string
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole]
  if (!rolePermissions) return false

  const resourcePermissions = rolePermissions[resource] as readonly string[]
  if (!resourcePermissions) return false

  return (
    resourcePermissions.includes(action) || resourcePermissions.includes("*")
  )
}

// Middleware pour vérifier les permissions dans les API routes
export function requirePermission(
  resource: keyof typeof ROLE_PERMISSIONS.owner,
  action: string
) {
  return function (userRole: UserRole): boolean {
    return hasPermission(userRole, resource, action)
  }
}

// Helper pour les composants React
export function usePermissions(userRole?: UserRole) {
  const can = (
    resource: keyof typeof ROLE_PERMISSIONS.owner,
    action: string
  ): boolean => {
    if (!userRole) return false
    return hasPermission(userRole, resource, action)
  }

  return { can }
}

// Constantes pour les vérifications courantes
export const PERMISSIONS = {
  // Workspace permissions
  CREATE_WORKSPACE: (role: UserRole) =>
    hasPermission(role, "workspace", "create"),
  UPDATE_WORKSPACE: (role: UserRole) =>
    hasPermission(role, "workspace", "update"),
  DELETE_WORKSPACE: (role: UserRole) =>
    hasPermission(role, "workspace", "delete"),

  // Bot permissions
  CREATE_BOT: (role: UserRole) => hasPermission(role, "bot", "create"),
  UPDATE_BOT: (role: UserRole) => hasPermission(role, "bot", "update"),
  DELETE_BOT: (role: UserRole) => hasPermission(role, "bot", "delete"),

  // User permissions
  INVITE_USER: (role: UserRole) => hasPermission(role, "user", "invite"),
  UPDATE_USER_ROLE: (role: UserRole) => hasPermission(role, "user", "update"),
  DELETE_USER: (role: UserRole) => hasPermission(role, "user", "delete"),

  // Organization permissions
  UPDATE_ORGANIZATION: (role: UserRole) =>
    hasPermission(role, "organization", "update"),
} as const
