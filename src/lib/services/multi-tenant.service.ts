import type {
  CreateOrganizationInput,
  CreateWorkspaceInput,
  Organization,
  User,
  UserRole,
  UserWorkspaceContext,
  Workspace,
  WorkspaceMember,
} from "@/types/multi-tenant"

import { TABLES, supabase, supabaseAdmin } from "@/lib/database/config"

// ============================================================================
// SERVICE ORGANISATION
// ============================================================================

export class OrganizationService {
  static async create(
    input: CreateOrganizationInput
  ): Promise<Organization | null> {
    if (!supabaseAdmin) {
      throw new Error("Admin client not available")
    }

    const { data, error } = await supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .insert({
        name: input.name,
        domain: input.domain,
        plan: input.plan || "starter",
        status: "active",
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to create organization:", error)
      return null
    }

    return data as Organization
  }

  static async getById(id: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .select("*")
      .eq("id", id)
      .single()

    if (error) return null
    return data as Organization
  }

  static async getByDomain(domain: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .select("*")
      .eq("domain", domain)
      .single()

    if (error) return null
    return data as Organization
  }

  static async getUserOrganizations(userId: string): Promise<Organization[]> {
    const { data, error } = await supabase
      .from(TABLES.WORKSPACE_MEMBERS)
      .select(
        `
        workspace:workspaces!inner(
          organization:organizations!inner(*)
        )
      `
      )
      .eq("user_id", userId)

    if (error) return []

    // Extraire les organisations uniques
    const orgs = new Map<string, Organization>()
    data.forEach((item: Record<string, unknown>) => {
      const workspace = item.workspace as { organization: Organization }
      const org = workspace.organization
      orgs.set(org.id, org)
    })

    return Array.from(orgs.values())
  }
}

// ============================================================================
// SERVICE WORKSPACE
// ============================================================================

export class WorkspaceService {
  static async create(
    input: CreateWorkspaceInput,
    createdBy: string
  ): Promise<Workspace | null> {
    if (!supabaseAdmin) {
      throw new Error("Admin client not available")
    }

    // 1. Créer le workspace
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from(TABLES.WORKSPACES)
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        slug: input.slug,
        description: input.description,
      })
      .select()
      .single()

    if (workspaceError) {
      console.error("Failed to create workspace:", workspaceError)
      return null
    }

    // 2. Ajouter le créateur comme owner
    const { error: memberError } = await supabaseAdmin
      .from(TABLES.WORKSPACE_MEMBERS)
      .insert({
        user_id: createdBy,
        workspace_id: workspace.id,
        role: "owner",
        invitation_accepted_at: new Date().toISOString(),
      })

    if (memberError) {
      console.error("Failed to add workspace owner:", memberError)
      return null
    }

    return workspace as Workspace
  }

  static async getById(id: string): Promise<Workspace | null> {
    const { data, error } = await supabase
      .from(TABLES.WORKSPACES)
      .select(
        `
        *,
        organization:organizations(*)
      `
      )
      .eq("id", id)
      .single()

    if (error) return null
    return data as Workspace
  }

  static async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const { data, error } = await supabase
      .from(TABLES.WORKSPACE_MEMBERS)
      .select(
        `
        role,
        workspace:workspaces!inner(
          *,
          organization:organizations(*)
        )
      `
      )
      .eq("user_id", userId)

    if (error) return []

    return data.map((item: Record<string, unknown>) => ({
      ...(item.workspace as Workspace),
      userRole: item.role as UserRole,
    })) as Workspace[]
  }

  static async getWorkspaceMembers(
    workspaceId: string
  ): Promise<WorkspaceMember[]> {
    const { data, error } = await supabase
      .from(TABLES.WORKSPACE_MEMBERS)
      .select(
        `
        *,
        user:users(*),
        inviter:users!workspace_members_invited_by_fkey(*)
      `
      )
      .eq("workspace_id", workspaceId)

    if (error) return []
    return data as WorkspaceMember[]
  }

  static async updateUserRole(
    workspaceId: string,
    userId: string,
    newRole: UserRole
  ): Promise<boolean> {
    const { error } = await supabase
      .from(TABLES.WORKSPACE_MEMBERS)
      .update({ role: newRole })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)

    return !error
  }

  static async removeMember(
    workspaceId: string,
    userId: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from(TABLES.WORKSPACE_MEMBERS)
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)

    return !error
  }
}

// ============================================================================
// SERVICE UTILISATEUR
// ============================================================================

export class UserService {
  static async createOrUpdate(userData: Partial<User>): Promise<User | null> {
    if (!userData.id) return null

    // Avec auth.users, l'utilisateur est déjà créé par Supabase Auth
    // On retourne simplement les données formatées depuis auth.users
    try {
      const { data: authUser, error } =
        await supabaseAdmin!.auth.admin.getUserById(userData.id)

      if (error || !authUser.user) {
        console.error("Failed to get user from auth.users:", error)
        return null
      }

      // Formatter les données pour correspondre au type User
      const user: User = {
        id: authUser.user.id,
        email: authUser.user.email || "",
        firstName:
          authUser.user.user_metadata?.first_name || userData.firstName,
        lastName: authUser.user.user_metadata?.last_name || userData.lastName,
        username: authUser.user.user_metadata?.username || userData.username,
        avatarUrl:
          authUser.user.user_metadata?.avatar_url || userData.avatarUrl,
        phoneNumber: authUser.user.phone || userData.phoneNumber,
        country: authUser.user.user_metadata?.country || userData.country,
        state: authUser.user.user_metadata?.state || userData.state,
        language:
          authUser.user.user_metadata?.language || userData.language || "en",
        created_at: new Date(authUser.user.created_at),
        createdAt: new Date(authUser.user.created_at),
        updatedAt: new Date(
          authUser.user.updated_at || authUser.user.created_at
        ),
      }

      return user
    } catch (error) {
      console.error("Failed to create/update user:", error)
      return null
    }
  }

  static async getById(id: string): Promise<User | null> {
    try {
      const { data: authUser, error } =
        await supabaseAdmin!.auth.admin.getUserById(id)

      if (error || !authUser.user) return null

      // Formatter les données depuis auth.users
      const user: User = {
        id: authUser.user.id,
        email: authUser.user.email || "",
        firstName: authUser.user.user_metadata?.first_name,
        lastName: authUser.user.user_metadata?.last_name,
        username: authUser.user.user_metadata?.username,
        avatarUrl: authUser.user.user_metadata?.avatar_url,
        phoneNumber: authUser.user.phone,
        country: authUser.user.user_metadata?.country,
        state: authUser.user.user_metadata?.state,
        language: authUser.user.user_metadata?.language || "en",
        created_at: new Date(authUser.user.created_at),
        createdAt: new Date(authUser.user.created_at),
        updatedAt: new Date(
          authUser.user.updated_at || authUser.user.created_at
        ),
      }

      return user
    } catch (error) {
      console.error("Failed to get user by id:", error)
      return null
    }
  }

  static async getByEmail(email: string): Promise<User | null> {
    try {
      const { data: users, error } = await supabaseAdmin!.auth.admin.listUsers()

      if (error) return null

      const authUser = users.users.find((user) => user.email === email)
      if (!authUser) return null

      // Formatter les données depuis auth.users
      const user: User = {
        id: authUser.id,
        email: authUser.email || "",
        firstName: authUser.user_metadata?.first_name,
        lastName: authUser.user_metadata?.last_name,
        username: authUser.user_metadata?.username,
        avatarUrl: authUser.user_metadata?.avatar_url,
        phoneNumber: authUser.phone,
        country: authUser.user_metadata?.country,
        state: authUser.user_metadata?.state,
        language: authUser.user_metadata?.language || "en",
        created_at: new Date(authUser.created_at),
        createdAt: new Date(authUser.created_at),
        updatedAt: new Date(authUser.updated_at || authUser.created_at),
      }

      return user
    } catch (error) {
      console.error("Failed to get user by email:", error)
      return null
    }
  }

  static async updatePlatformRole(
    userId: string,
    role: UserRole | string
  ): Promise<boolean> {
    try {
      if (!supabaseAdmin) {
        console.error("Admin client not available")
        return false
      }

      // Mettre à jour le rôle dans app_metadata
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: { platform_role: role },
      })

      if (error) {
        console.error("Failed to update platform role:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Failed to update platform role:", error)
      return false
    }
  }
}

// ============================================================================
// SERVICE DE CONTEXTE WORKSPACE
// ============================================================================

export class WorkspaceContextService {
  static async getUserWorkspaceContext(
    userId: string
  ): Promise<UserWorkspaceContext | null> {
    const workspaces = await WorkspaceService.getUserWorkspaces(userId)

    if (workspaces.length === 0) {
      return null
    }

    // Par défaut, prendre le premier workspace
    const currentWorkspace = workspaces[0]

    return {
      userId,
      currentWorkspaceId: currentWorkspace.id,
      currentRole: (currentWorkspace as Workspace & { userRole: UserRole })
        .userRole,
      availableWorkspaces: workspaces.map((w: Workspace) => {
        const workspaceWithRole = w as Workspace & {
          userRole: UserRole
          organization?: Organization
        }
        return {
          workspaceId: w.id,
          workspaceName: w.name,
          role: workspaceWithRole.userRole,
          organizationName: workspaceWithRole.organization?.name || "Unknown",
        }
      }),
    }
  }

  static async switchWorkspace(
    userId: string,
    workspaceId: string
  ): Promise<UserWorkspaceContext | null> {
    // Vérifier que l'utilisateur appartient au workspace
    const { data, error } = await supabase
      .from(TABLES.WORKSPACE_MEMBERS)
      .select(
        `
        role,
        workspace:workspaces!inner(
          *,
          organization:organizations(*)
        )
      `
      )
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .single()

    if (error || !data) {
      return null
    }

    // Récupérer tous les workspaces de l'utilisateur
    const allWorkspaces = await WorkspaceService.getUserWorkspaces(userId)

    return {
      userId,
      currentWorkspaceId: workspaceId,
      currentRole: data.role as UserRole,
      availableWorkspaces: allWorkspaces.map((w: Workspace) => {
        const workspaceWithRole = w as Workspace & {
          userRole: UserRole
          organization?: Organization
        }
        return {
          workspaceId: w.id,
          workspaceName: w.name,
          role: workspaceWithRole.userRole,
          organizationName: workspaceWithRole.organization?.name || "Unknown",
        }
      }),
    }
  }
}

// ============================================================================
// SERVICE ONBOARDING
// ============================================================================

export class OnboardingService {
  static async createUserWithOrganization(userData: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    organizationName?: string
  }): Promise<{
    user: User
    organization: Organization
    workspace: Workspace
  } | null> {
    if (!supabaseAdmin) {
      throw new Error("Admin client not available")
    }

    try {
      // 1. Créer l'utilisateur
      const user = await UserService.createOrUpdate({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
      })

      if (!user) {
        throw new Error("Failed to create user")
      }

      // 2. Déterminer le nom de l'organisation
      const orgName =
        userData.organizationName ||
        `${userData.firstName || userData.email.split("@")[0]}'s Organization`

      // 3. Extraire le domaine de l'email pour l'organisation
      const emailDomain = userData.email.split("@")[1]
      const domain =
        emailDomain === "gmail.com" || emailDomain === "outlook.com"
          ? undefined
          : emailDomain

      // 4. Créer l'organisation
      const organization = await OrganizationService.create({
        name: orgName,
        domain,
        plan: "starter",
      })

      if (!organization) {
        throw new Error("Failed to create organization")
      }

      // 5. Récupérer le workspace créé automatiquement par le trigger
      // Le trigger create_default_workspace_trigger a déjà créé un workspace personnalisé
      // et ajouté l'utilisateur comme owner

      // Attendre un peu pour que le trigger se termine
      await new Promise((resolve) => setTimeout(resolve, 100))

      const userWorkspaces = await WorkspaceService.getUserWorkspaces(user.id)

      if (userWorkspaces.length === 0) {
        throw new Error("Failed to find workspace created by trigger")
      }

      // Prendre le workspace créé par le trigger (le plus récent)
      const workspace = userWorkspaces[0]

      return { user, organization, workspace }
    } catch (error) {
      console.error("Onboarding failed:", error)
      return null
    }
  }

  static async handleExistingUser(
    userId: string,
    workspaceId?: string
  ): Promise<UserWorkspaceContext | null> {
    if (workspaceId) {
      return WorkspaceContextService.switchWorkspace(userId, workspaceId)
    }

    return WorkspaceContextService.getUserWorkspaceContext(userId)
  }
}
