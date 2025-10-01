"use client"

import { useState } from "react"
import { createClient } from "@/supabase/server"

import type { WorkspaceMember } from "@/types/multi-tenant"

export function useMembers() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getWorkspaceMembers = async (
    workspaceId: string
  ): Promise<WorkspaceMember[]> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/workspaces/${workspaceId}/members`)

      if (!response.ok) {
        throw new Error("Failed to fetch members")
      }

      const data = await response.json()
      return data.members || []
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch members"
      setError(errorMessage)
      console.error("Error fetching workspace members:", err)
      return []
    } finally {
      setLoading(false)
    }
  }

  const removeMember = async (
    workspaceId: string,
    userId: string
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/workspaces/${workspaceId}/members?userId=${userId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove member")
      }

      return true
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to remove member"
      setError(errorMessage)
      console.error("Error removing member:", err)
      return false
    } finally {
      setLoading(false)
    }
  }

  const updateMemberRole = async (
    workspaceId: string,
    userId: string,
    newRole: "admin" | "member"
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const supabase = await createClient()
      const { error } = await supabase
        .from("workspace_members")
        .update({ role: newRole })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)

      if (error) {
        throw new Error(error.message)
      }

      return true
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update member role"
      setError(errorMessage)
      console.error("Error updating member role:", err)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    getWorkspaceMembers,
    removeMember,
    updateMemberRole,
  }
}
