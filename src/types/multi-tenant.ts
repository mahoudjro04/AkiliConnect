// Types pour l'architecture multi-tenant d'Akili Connect

// ============================================================================
// TYPES DE BASE
// ============================================================================

export type UUID = string

// Rôles workspace (niveau locataire)
export type WorkspaceRole = "owner" | "admin" | "member"

// Rôles plateforme (si besoin d'extension future)
export type PlatformRole = "super_admin" | "user" | "support"

// Compat ancien nom (dépréciation progressive) - à remplacer dans les imports
export type UserRole = WorkspaceRole
export type OrganizationPlan = "starter" | "pro" | "enterprise"
export type OrganizationStatus = "active" | "inactive" | "suspended"

// ============================================================================
// ENTITÉS PRINCIPALES
// ============================================================================

export interface PlatformAdmin {
  id: UUID
  email: string
  permissions: Record<string, string | number | boolean>
  createdAt: Date
  updatedAt: Date
}

export interface Organization {
  id: UUID
  name: string
  description?: string
  website?: string
  domain?: string
  plan: OrganizationPlan
  status: OrganizationStatus
  owner_id: UUID
  settings: Record<string, string | number | boolean>
  created_at: Date
  createdAt: Date
  updated_at: Date
  updatedAt: Date
  // Relations
  owner?: User
  workspaces?: Workspace[]
  totalMembers?: number
}

export interface Workspace {
  id: UUID
  organizationId: UUID
  name: string
  slug: string
  description?: string
  settings: Record<string, string | number | boolean>
  createdAt: Date
  updatedAt: Date
  // Relations
  organization?: Organization
  members?: WorkspaceMember[]
  memberCount?: number
}

export interface User {
  id: UUID
  email: string
  firstName?: string
  lastName?: string
  username?: string
  avatarUrl?: string
  avatar_url?: string
  phoneNumber?: string
  country?: string
  state?: string
  language: string
  role?: UserRole
  created_at: Date
  createdAt: Date
  updatedAt: Date
  // Computed
  fullName?: string
  full_name?: string
  initials?: string
  // Relations
  organization?: Organization
}

export interface WorkspaceMember {
  id: UUID
  userId: UUID
  workspaceId: UUID
  role: WorkspaceRole
  joinedAt: Date
  created_at: Date
  invitedBy?: UUID
  invitationAcceptedAt?: Date
  // Relations
  user?: User
  workspace?: Workspace
  inviter?: User
}

export interface WorkspaceInvitation {
  id: UUID
  workspaceId: UUID
  email: string
  role: UserRole
  invitedBy: UUID
  token: string
  status: "pending" | "accepted" | "cancelled" | "expired"
  message?: string
  expiresAt: Date
  acceptedAt?: Date
  created_at: Date
  createdAt: Date
  // Relations
  workspace?: Workspace
  invited_by?: User
  inviter?: User
}

// Note: Interface OrganizationSubscription sera ajoutée plus tard

// ============================================================================
// RESSOURCES FONCTIONNELLES
// ============================================================================

export interface Bot {
  id: UUID
  workspaceId: UUID
  name: string
  description?: string
  type: string
  configuration: Record<string, string | number | boolean>
  isActive: boolean
  createdBy: UUID
  createdAt: Date
  updatedAt: Date
  // Relations
  workspace?: Workspace
  creator?: User
}

export interface KnowledgeBase {
  id: UUID
  workspaceId: UUID
  name: string
  description?: string
  settings: Record<string, string | number | boolean>
  createdBy: UUID
  createdAt: Date
  updatedAt: Date
  // Relations
  workspace?: Workspace
  creator?: User
}

export interface AuditLog {
  id: UUID
  workspaceId?: UUID
  userId?: UUID
  action: string
  resourceType?: string
  resourceId?: UUID
  metadata: Record<string, string | number | boolean>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  // Relations
  workspace?: Workspace
  user?: User
}

// ============================================================================
// CONTEXTES ET SESSIONS
// ============================================================================

export interface UserWorkspaceContext {
  userId: UUID
  currentWorkspaceId: UUID
  currentRole: UserRole
  availableWorkspaces: Array<{
    workspaceId: UUID
    workspaceName: string
    role: UserRole
    organizationName: string
  }>
}

export interface AuthSession {
  user: User
  workspaceContext?: UserWorkspaceContext
}

// ============================================================================
// INTERFACES DE SERVICE
// ============================================================================

export interface CreateOrganizationInput {
  name: string
  domain?: string
  plan?: OrganizationPlan
}

export interface CreateWorkspaceInput {
  organizationId: UUID
  name: string
  slug: string
  description?: string
}

export interface InviteUserInput {
  workspaceId: UUID
  email: string
  role: UserRole
  invitedBy: UUID
}

export interface CreateBotInput {
  workspaceId: UUID
  name: string
  description?: string
  type?: string
  configuration?: Record<string, string | number | boolean>
  createdBy: UUID
}

// ============================================================================
// PERMISSIONS ET VALIDATION
// ============================================================================

export interface Permission {
  action: string
  resource: string
  condition?: Record<string, string | number | boolean>
}

export interface RolePermissions {
  [role: string]: Permission[]
}

// Permissions par défaut selon les rôles
export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  owner: [
    { action: "*", resource: "*" }, // Accès complet
  ],
  admin: [
    { action: "create", resource: "bot" },
    { action: "read", resource: "bot" },
    { action: "update", resource: "bot" },
    { action: "delete", resource: "bot" },
    { action: "create", resource: "knowledge_base" },
    { action: "read", resource: "knowledge_base" },
    { action: "update", resource: "knowledge_base" },
    { action: "delete", resource: "knowledge_base" },
    { action: "invite", resource: "user" },
    { action: "read", resource: "workspace" },
    { action: "update", resource: "workspace" },
  ],
  member: [
    { action: "read", resource: "bot" },
    { action: "read", resource: "knowledge_base" },
    { action: "read", resource: "workspace" },
  ],
}

// ============================================================================
// TYPES POUR LES API RESPONSES
// ============================================================================

export interface ApiResponse<T> {
  data?: T
  error?: {
    message: string
    code?: string
    details?: Record<string, unknown>
  }
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================================================
// TYPES POUR LES DASHBOARDS
// ============================================================================

export interface OrganizationMetrics {
  totalUsers: number
  activeUsers: number
  totalWorkspaces: number
  totalBots: number
  planUsage: {
    current: OrganizationPlan
    limits: {
      users: number
      workspaces: number
      bots: number
      storage: number // en MB
    }
    used: {
      users: number
      workspaces: number
      bots: number
      storage: number
    }
  }
}

export interface PlatformMetrics {
  totalOrganizations: number
  activeOrganizations: number
  totalUsers: number
  monthlyActiveUsers: number
  revenue: {
    mrr: number // Monthly Recurring Revenue
    arr: number // Annual Recurring Revenue
  }
  planDistribution: Record<OrganizationPlan, number>
}

// Alias pour compatibilité avec les APIs
export type Invitation = WorkspaceInvitation

// ============================================================================
// TYPES POUR LES FORMULAIRES
// ============================================================================

export interface CreateOrganizationForm {
  name: string
  domain?: string
}

export interface CreateWorkspaceForm {
  name: string
  description?: string
}

export interface InviteUserForm {
  email: string
  role: UserRole
  message?: string
}

export interface WorkspaceSettingsForm {
  name: string
  description?: string
  settings: Record<string, string | number | boolean>
}
