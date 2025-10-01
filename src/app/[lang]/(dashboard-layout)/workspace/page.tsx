"use client"

import { useEffect, useState } from "react"
import { Bot, Building, Database, Plus, Users } from "lucide-react"

import type { Workspace, WorkspaceMember } from "@/types/multi-tenant"

import { usePermissions } from "@/lib/permissions"

import { useAuth, useWorkspace } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkspaceSelector } from "@/components/workspace-selector"

export default function WorkspaceDashboard() {
  const { user, loading } = useAuth()
  const { currentRole } = useWorkspace()
  const { can } = usePermissions(currentRole)

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [stats, setStats] = useState({
    bots: 0,
    knowledgeBases: 0,
    activeMembers: 0,
  })

  // Charger les données du workspace
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      if (!user) return

      try {
        // Récupérer les informations du workspace actuel
        const workspaceResponse = await fetch("/api/workspaces/current")
        if (workspaceResponse.ok) {
          const workspaceData = await workspaceResponse.json()
          setWorkspace(workspaceData.workspace)
          setMembers(workspaceData.members || [])
          setStats(
            workspaceData.stats || {
              bots: 0,
              knowledgeBases: 0,
              activeMembers: 0,
            }
          )
        }
      } catch (error) {
        console.error("Error fetching workspace data:", error)
      }
    }

    fetchWorkspaceData()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">Loading...</div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">Please sign in</div>
    )
  }

  const roleColors = {
    owner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    member: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header avec sélecteur de workspace */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workspace Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your workspace resources and team
          </p>
        </div>
        <WorkspaceSelector />
      </div>

      {/* Informations du workspace */}
      {workspace && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building className="size-5" />
                {workspace.name}
              </CardTitle>
              <Badge
                variant="secondary"
                className={roleColors[currentRole || "member"]}
              >
                Your role: {currentRole}
              </Badge>
            </div>
            {workspace.description && (
              <p className="text-sm text-muted-foreground">
                {workspace.description}
              </p>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bots</CardTitle>
            <Bot className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bots}</div>
            {can("bot", "create") && (
              <Button size="sm" className="mt-2">
                <Plus className="mr-2 size-4" />
                Create Bot
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Knowledge Bases
            </CardTitle>
            <Database className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.knowledgeBases}</div>
            {can("knowledgeBase", "create") && (
              <Button size="sm" className="mt-2">
                <Plus className="mr-2 size-4" />
                Create KB
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            {can("user", "invite") && (
              <Button size="sm" className="mt-2">
                <Plus className="mr-2 size-4" />
                Invite Member
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Liste des membres d'équipe */}
      {members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                      {member.user?.firstName?.[0] ||
                        member.user?.email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.user?.firstName} {member.user?.lastName}
                        {!member.user?.firstName && member.user?.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={roleColors[member.role]}
                    >
                      {member.role}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions rapides selon les permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {can("bot", "create") && <Button>Create New Bot</Button>}
            {can("knowledgeBase", "create") && (
              <Button variant="outline">Create Knowledge Base</Button>
            )}
            {can("user", "invite") && (
              <Button variant="outline">Invite Team Member</Button>
            )}
            {can("workspace", "update") && (
              <Button variant="outline">Workspace Settings</Button>
            )}
            {can("organization", "update") && (
              <Button variant="outline">Organization Settings</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
