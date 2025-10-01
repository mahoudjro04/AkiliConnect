"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle,
  Clock,
  Copy,
  Crown,
  Mail,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  UserMinus,
  Users,
  XCircle,
} from "lucide-react"

import type { WorkspaceInvitation, WorkspaceMember } from "@/types/multi-tenant"

import { useWorkspace } from "@/hooks/use-auth"
import { useInvitations } from "@/hooks/use-invitations"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { InviteUserModal } from "./invite-user-modal"

export function MembersManagement() {
  const [members, _setMembers] = useState<WorkspaceMember[]>([])
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loading, setLoading] = useState(true)

  const { currentWorkspace, user } = useWorkspace()
  const { getWorkspaceInvitations, cancelInvitation } = useInvitations()

  const loadData = useCallback(async () => {
    if (!currentWorkspace) return

    try {
      setLoading(true)

      // Charger les invitations
      const invitationsData = await getWorkspaceInvitations(currentWorkspace)
      setInvitations(invitationsData)

      // TODO: Implémenter la récupération des membres
      // const membersData = await getWorkspaceMembers(currentWorkspace)
      // setMembers(membersData)
    } catch (error) {
      console.error("Failed to load workspace data:", error)
      toast.error("Failed to load workspace data")
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace, getWorkspaceInvitations])

  useEffect(() => {
    loadData()
  }, [currentWorkspace, loadData])

  const handleCancelInvitation = async (invitationId: string) => {
    const success = await cancelInvitation(invitationId)
    if (success) {
      toast.success("Invitation cancelled")
      loadData() // Recharger les données
    } else {
      toast.error("Failed to cancel invitation")
    }
  }

  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/invite?token=${token}`
    navigator.clipboard.writeText(link)
    toast.success("Invitation link copied to clipboard")
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="size-4 text-yellow-500" />
      case "accepted":
        return <CheckCircle className="size-4 text-green-500" />
      case "cancelled":
        return <XCircle className="size-4 text-red-500" />
      default:
        return <Clock className="size-4 text-gray-500" />
    }
  }

  const canManageMembers = user?.role === "owner" || user?.role === "admin"

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Members</h2>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Members</h2>
          <p className="text-muted-foreground">
            Manage workspace members and invitations
          </p>
        </div>
        {canManageMembers && <InviteUserModal onInviteSent={loadData} />}
      </div>

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Active Members ({members.length})
          </CardTitle>
          <CardDescription>
            Users who have access to this workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active members yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage
                            src={
                              member.user?.avatar_url || member.user?.avatarUrl
                            }
                          />
                          <AvatarFallback>
                            {member.user?.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {member.user?.email}
                          </div>
                          {(member.user?.full_name ||
                            member.user?.fullName) && (
                            <div className="text-sm text-muted-foreground">
                              {member.user?.full_name || member.user?.fullName}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        <div className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          <span className="capitalize">{member.role}</span>
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(
                        member.created_at || member.joinedAt
                      ).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {canManageMembers && member.user?.id !== user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem className="text-destructive">
                              <UserMinus className="mr-2 size-4" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {canManageMembers && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <CardDescription>
              Invitations that haven&apos;t been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback>
                            {invitation.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{invitation.email}</div>
                          <div className="text-sm text-muted-foreground">
                            Invited by {invitation.invited_by?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(invitation.role)}>
                        <div className="flex items-center gap-1">
                          {getRoleIcon(invitation.role)}
                          <span className="capitalize">{invitation.role}</span>
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(invitation.status)}
                        <span className="capitalize">{invitation.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(
                        invitation.createdAt || invitation.created_at
                      ).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => copyInvitationLink(invitation.token)}
                          >
                            <Copy className="mr-2 size-4" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              handleCancelInvitation(invitation.id)
                            }
                          >
                            <XCircle className="mr-2 size-4" />
                            Cancel
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
      )}
    </div>
  )
}
