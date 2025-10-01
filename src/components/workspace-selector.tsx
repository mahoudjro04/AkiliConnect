"use client"

import { useState } from "react"
import { Building, Check, ChevronDown, Plus } from "lucide-react"

import { useWorkspace } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function WorkspaceSelector() {
  const {
    currentWorkspace,
    currentRole,
    availableWorkspaces,
    switchWorkspace,
  } = useWorkspace()

  const [isLoading, setIsLoading] = useState(false)

  const handleWorkspaceChange = async (workspaceId: string) => {
    if (workspaceId === currentWorkspace || isLoading) return

    setIsLoading(true)
    try {
      await switchWorkspace(workspaceId)
    } catch (error) {
      console.error("Failed to switch workspace:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const currentWorkspaceData = availableWorkspaces.find(
    (ws) => ws.workspaceId === currentWorkspace
  )

  if (!currentWorkspaceData) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Building className="mr-2 size-4" />
        No workspace
      </Button>
    )
  }

  const roleColors = {
    owner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    member: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-60 justify-between"
          disabled={isLoading}
        >
          <div className="flex items-center">
            <Building className="mr-2 size-4" />
            <div className="flex flex-col items-start">
              <span className="truncate font-medium">
                {currentWorkspaceData.workspaceName}
              </span>
              <span className="text-xs text-muted-foreground">
                {currentWorkspaceData.organizationName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge
              variant="secondary"
              className={`text-xs ${roleColors[currentRole || "member"]}`}
            >
              {currentRole}
            </Badge>
            <ChevronDown className="size-4 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-60" align="start">
        <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {availableWorkspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.workspaceId}
            onClick={() => handleWorkspaceChange(workspace.workspaceId)}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="font-medium">{workspace.workspaceName}</span>
              <span className="text-xs text-muted-foreground">
                {workspace.organizationName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Badge
                variant="secondary"
                className={`text-xs ${roleColors[workspace.role]}`}
              >
                {workspace.role}
              </Badge>
              {workspace.workspaceId === currentWorkspace && (
                <Check className="size-4" />
              )}
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <Plus className="mr-2 size-4" />
          Create Workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
