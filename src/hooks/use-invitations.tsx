"use client"

import { useState } from "react"

import type { WorkspaceInvitation } from "@/types/multi-tenant"

import { useAuth } from "./use-auth"

interface InviteUserData {
  email: string
  role: "admin" | "member"
  message?: string
}

export function useInvitations() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Envoyer une invitation
  const sendInvitation = async (
    workspaceId: string,
    inviteData: InviteUserData
  ): Promise<boolean> => {
    if (!user) {
      setError("Authentication required")
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(inviteData),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation")
      }

      return true
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send invitation"
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Vérifier une invitation par token
  const verifyInvitation = async (
    token: string
  ): Promise<WorkspaceInvitation | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/invitations/${token}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          setError("Invalid or expired invitation")
        } else {
          setError(data.error || "Failed to verify invitation")
        }
        return null
      }

      return data.invitation
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to verify invitation"
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Accepter une invitation
  const acceptInvitation = async (token: string): Promise<boolean> => {
    if (!user) {
      setError("Authentication required")
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invitation")
      }

      return true
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to accept invitation"
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Récupérer les invitations d'un workspace
  const getWorkspaceInvitations = async (
    workspaceId: string
  ): Promise<WorkspaceInvitation[]> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch invitations")
      }

      return data.invitations || []
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch invitations"
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Annuler une invitation
  const cancelInvitation = async (invitationId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/invitations/${invitationId}/cancel`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to cancel invitation")
        return false
      }

      return true
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to cancel invitation"
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    sendInvitation,
    verifyInvitation,
    acceptInvitation,
    getWorkspaceInvitations,
    cancelInvitation,
    clearError: () => setError(null),
  }
}
