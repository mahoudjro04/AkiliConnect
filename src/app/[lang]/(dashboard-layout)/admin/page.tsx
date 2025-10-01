"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Activity,
  Ban,
  BarChart3,
  Building2,
  CheckCircle,
  Crown,
  Database,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react"

import type { Organization, User, Workspace } from "@/types/multi-tenant"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateOrganizationModal } from "@/components/create-organization-modal"
import { CreateWorkspaceModal } from "@/components/create-workspace-modal"

interface SuperAdminStats {
  totalOrganizations: number
  totalWorkspaces: number
  totalUsers: number
  activeUsers: number
  monthlyGrowth: {
    organizations: number
    workspaces: number
    users: number
  }
}

export default function SuperAdminDashboard() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<SuperAdminStats>({
    totalOrganizations: 0,
    totalWorkspaces: 0,
    totalUsers: 0,
    activeUsers: 0,
    monthlyGrowth: {
      organizations: 0,
      workspaces: 0,
      users: 0,
    },
  })
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)

  // Vérifier les droits d'accès au chargement
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch("/api/admin/check-access")
        if (response.ok) {
          setHasAccess(true)
        } else {
          setHasAccess(false)
          if (response.status === 403) {
            toast.error("Access denied: Super admin privileges required")
          } else {
            toast.error("Failed to verify access")
          }
        }
      } catch (error) {
        console.error("Error checking access:", error)
        setHasAccess(false)
        toast.error("Failed to verify access")
      } finally {
        setCheckingAccess(false)
      }
    }

    checkAccess()
  }, [])

  useEffect(() => {
    if (hasAccess) {
      loadDashboardData()
    }
  }, [hasAccess])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Charger les statistiques
      const statsResponse = await fetch("/api/admin/stats")
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Charger les organisations
      const orgsResponse = await fetch("/api/admin/organizations")
      if (orgsResponse.ok) {
        const orgsData = await orgsResponse.json()
        setOrganizations(orgsData.organizations || [])
      }

      // Charger les workspaces récents
      const workspacesResponse = await fetch("/api/admin/workspaces?limit=10")
      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json()
        setWorkspaces(workspacesData.workspaces || [])
      }

      // Charger les utilisateurs récents
      const usersResponse = await fetch("/api/admin/users?limit=10")
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const handleSuspendOrganization = async (orgId: string) => {
    try {
      const response = await fetch(
        `/api/admin/organizations/${orgId}/suspend`,
        {
          method: "POST",
        }
      )

      if (response.ok) {
        toast.success("Organization suspended")
        loadDashboardData()
      } else {
        toast.error("Failed to suspend organization")
      }
    } catch (error) {
      console.error("Error suspending organization:", error)
      toast.error("Failed to suspend organization")
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="size-4" />
      case "admin":
        return <ShieldCheck className="size-4" />
      case "member":
        return <Shield className="size-4" />
      default:
        return <Users className="size-4" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default" as const
      case "admin":
        return "secondary" as const
      case "member":
        return "outline" as const
      default:
        return "outline" as const
    }
  }

  // Écran de vérification d'accès
  if (checkingAccess) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Verifying access...</div>
        </div>
      </div>
    )
  }

  // Écran d'accès refusé
  if (!hasAccess) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Shield className="size-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-center max-w-md">
            You need super admin privileges to access this page. Contact your
            system administrator if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="size-8 text-primary" />
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Platform management and oversight
          </p>
        </div>
        <div className="flex gap-2">
          <CreateOrganizationModal />
          <CreateWorkspaceModal />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.monthlyGrowth.organizations} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
            <Database className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkspaces}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.monthlyGrowth.workspaces} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.monthlyGrowth.users} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of
              total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" />
                Organizations ({organizations.length})
              </CardTitle>
              <CardDescription>
                Manage all organizations on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Workspaces</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{org.name}</div>
                          {org.description && (
                            <div className="text-sm text-muted-foreground">
                              {org.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {org.owner?.email || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {org.workspaces?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{org.totalMembers || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            org.status === "active" ? "default" : "destructive"
                          }
                        >
                          {org.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <CheckCircle className="mr-2 size-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleSuspendOrganization(org.id)}
                            >
                              <Ban className="mr-2 size-4" />
                              Suspend
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspaces">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5" />
                Recent Workspaces ({workspaces.length})
              </CardTitle>
              <CardDescription>
                Latest workspaces created on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workspaces.map((workspace) => (
                    <TableRow key={workspace.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{workspace.name}</div>
                          {workspace.description && (
                            <div className="text-sm text-muted-foreground">
                              {workspace.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {workspace.organization?.name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {workspace.memberCount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(workspace.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <CheckCircle className="mr-2 size-4" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="size-5" />
                Recent Users ({users.length})
              </CardTitle>
              <CardDescription>
                Latest users registered on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.email}</div>
                          {user.full_name && (
                            <div className="text-sm text-muted-foreground">
                              {user.full_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.organization?.name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getRoleBadgeVariant(user.role || "member")}
                        >
                          <div className="flex items-center gap-1">
                            {getRoleIcon(user.role || "member")}
                            <span className="capitalize">
                              {user.role || "member"}
                            </span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">Active</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <CheckCircle className="mr-2 size-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Ban className="mr-2 size-4" />
                              Suspend User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="size-5" />
                Platform Analytics
              </CardTitle>
              <CardDescription>Usage metrics and growth trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="mx-auto size-16 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Analytics Coming Soon
                </h3>
                <p>
                  Detailed analytics and reporting features are in development.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
