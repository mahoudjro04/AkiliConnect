"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { createClient } from "@/supabase/client"

import type { UserWorkspaceContext } from "@/types/multi-tenant"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  workspaceContext: UserWorkspaceContext | null
  loading: boolean
  signOut: () => Promise<void>
  switchWorkspace: (workspaceId: string) => Promise<boolean>
  refreshContext: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [workspaceContext, setWorkspaceContext] =
    useState<UserWorkspaceContext | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Fonction pour récupérer le contexte workspace
  const fetchWorkspaceContext = useCallback(async (_userId: string) => {
    try {
      const response = await fetch("/api/auth/context")
      if (response.ok) {
        const data = await response.json()
        setWorkspaceContext(data.workspaceContext)
      }
    } catch (error) {
      console.error("Error fetching workspace context:", error)
    }
  }, [])

  // Fonction pour rafraîchir le contexte
  const refreshContext = async () => {
    if (user) {
      await fetchWorkspaceContext(user.id)
    }
  }

  // Fonction pour changer de workspace
  const switchWorkspace = async (workspaceId: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceId }),
      })

      if (response.ok) {
        const data = await response.json()
        setWorkspaceContext(data.workspaceContext)
        return true
      }

      return false
    } catch (error) {
      console.error("Error switching workspace:", error)
      return false
    }
  }

  // Fonction de déconnexion
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setWorkspaceContext(null)
  }

  useEffect(() => {
    // Récupérer la session initiale
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user)
        await fetchWorkspaceContext(session.user.id)
      }

      setLoading(false)
    }

    getInitialSession()

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchWorkspaceContext(session.user.id)
      } else {
        setUser(null)
        setWorkspaceContext(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchWorkspaceContext, supabase.auth])

  const value = {
    user,
    workspaceContext,
    loading,
    signOut,
    switchWorkspace,
    refreshContext,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Hook spécialisé pour le workspace
export function useWorkspace() {
  const { user, workspaceContext, switchWorkspace, refreshContext } = useAuth()

  return {
    user,
    currentWorkspace: workspaceContext?.currentWorkspaceId,
    currentRole: workspaceContext?.currentRole,
    availableWorkspaces: workspaceContext?.availableWorkspaces || [],
    switchWorkspace,
    refreshContext,
  }
}
