// Types spécifiques pour les résultats de requêtes Supabase
// Ces types correspondent aux données réelles retournées par Supabase

export interface OrganizationQueryResult {
  id: string
  name: string
  description: string | null
  website: string | null
  status: string
  created_at: string
  updated_at: string
  owner:
    | {
        id: string
        email: string
        full_name: string | null
      }[]
    | null
}

export interface WorkspaceQueryResult {
  id: string
  name: string
  description: string | null
  type: string
  created_at: string
  updated_at: string
  organization:
    | {
        id: string
        name: string
      }[]
    | null
}

export interface UserQueryResult {
  id: string
  email: string
  full_name: string | null
  username: string | null
  created_at: string
  updated_at: string
  last_sign_in_at: string | null
}

export interface WorkspaceMemberQueryResult {
  id: string
  user_id: string
  workspace_id: string
  role: string
  status: string
  joined_at: string
  user:
    | {
        id: string
        email: string
        full_name: string | null
        avatar_url: string | null
      }[]
    | null
  workspace:
    | {
        id: string
        name: string
        organization:
          | {
              id: string
              name: string
            }[]
          | null
      }[]
    | null
}
