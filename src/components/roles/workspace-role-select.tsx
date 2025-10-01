"use client"

import * as React from "react"
import { useState, useTransition } from "react"

import { cn } from "@/lib/utils"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface WorkspaceRoleSelectProps {
  workspaceId: string
  userId: string
  initialRole: "owner" | "admin" | "member"
  className?: string
  disabled?: boolean
  onRoleChange?: (role: string) => void
}

export function WorkspaceRoleSelect({
  workspaceId,
  userId,
  initialRole,
  className,
  disabled,
  onRoleChange,
}: WorkspaceRoleSelectProps) {
  const [role, setRole] = useState<"owner" | "admin" | "member">(initialRole)
  const [isPending, startTransition] = useTransition()

  function update(next: string) {
    if (next === role) return
    const prev = role
    setRole(next as "owner" | "admin" | "member")
    startTransition(async () => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${userId}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: next }),
        }
      )
      if (!res.ok) {
        setRole(prev)
        // TODO: integrate toast error
      } else {
        onRoleChange?.(next)
      }
    })
  }

  return (
    <Select
      value={role}
      onValueChange={update}
      disabled={disabled || isPending}
    >
      <SelectTrigger className={cn("w-[160px]", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="owner">Owner</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="member">Member</SelectItem>
      </SelectContent>
    </Select>
  )
}
