"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  CheckCircle,
  Clock,
  Loader2,
  Mail,
  Shield,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react"

import { useInvitations } from "@/hooks/use-invitations"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface InvitationData {
  id: string
  email: string
  role: string
  status: string
  message?: string
  workspace?: {
    id: string
    name: string
    description?: string
  }
  invited_by?: {
    email: string
  }
}

export default function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { verifyInvitation, acceptInvitation, loading } = useInvitations()

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided")
      setIsLoading(false)
      return
    }

    const loadInvitation = async () => {
      try {
        const invitationData = await verifyInvitation(token)
        if (invitationData) {
          setInvitation(invitationData)
        } else {
          setError("Invalid or expired invitation")
        }
      } catch (_err) {
        setError("Failed to verify invitation")
      } finally {
        setIsLoading(false)
      }
    }

    loadInvitation()
  }, [token, verifyInvitation])

  const handleAcceptInvitation = async () => {
    if (!token) return

    const success = await acceptInvitation(token)
    if (success) {
      toast.success("Invitation accepted! Welcome to the workspace.")
      router.push("/workspace")
    } else {
      toast.error("Failed to accept invitation")
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
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
      case "admin":
        return "default" as const
      case "member":
        return "secondary" as const
      default:
        return "outline" as const
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="flex items-center gap-3">
              <Loader2 className="size-6 animate-spin" />
              <span>Verifying invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto size-12 text-destructive" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push("/")}
            >
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto size-12 text-destructive" />
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>
              This invitation may have expired or been revoked.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push("/")}
            >
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (invitation.status === "accepted") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto size-12 text-green-500" />
            <CardTitle>Already Accepted</CardTitle>
            <CardDescription>
              You have already accepted this invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => router.push("/dashboard")}
            >
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (invitation.status === "cancelled") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto size-12 text-destructive" />
            <CardTitle>Invitation Cancelled</CardTitle>
            <CardDescription>
              This invitation has been cancelled by the workspace admin.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push("/")}
            >
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-blue-100">
            <Mail className="size-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">You&apos;re Invited!</CardTitle>
          <CardDescription>
            Join {invitation.workspace?.name} and start collaborating
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Workspace</span>
              <span className="text-sm">{invitation.workspace?.name}</span>
            </div>

            {invitation.workspace?.description && (
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium">Description</span>
                <span className="text-sm text-right max-w-xs">
                  {invitation.workspace.description}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Role</span>
              <Badge variant={getRoleBadgeVariant(invitation.role)}>
                <div className="flex items-center gap-1">
                  {getRoleIcon(invitation.role)}
                  <span className="capitalize">{invitation.role}</span>
                </div>
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Invited by</span>
              <span className="text-sm">{invitation.invited_by?.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant="outline">
                <Clock className="mr-1 size-3" />
                Pending
              </Badge>
            </div>
          </div>

          {invitation.message && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-sm font-medium">Personal Message</span>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    {invitation.message}
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="text-center text-sm text-muted-foreground">
            By accepting this invitation, you agree to join the workspace and
            follow the team&apos;s guidelines.
          </div>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/")}
            disabled={loading}
          >
            Decline
          </Button>
          <Button
            className="flex-1"
            onClick={handleAcceptInvitation}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 size-4" />
                Accept Invitation
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
