"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import {
  AlertTriangle,
  Building2,
  Calendar,
  Save,
  Settings,
  Trash2,
  Users,
} from "lucide-react"

import type { Organization } from "@/types/multi-tenant"

import { useWorkspace } from "@/hooks/use-auth"
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

const organizationFormSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
})

type OrganizationFormData = z.infer<typeof organizationFormSchema>

export default function OrganizationSettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({
    totalWorkspaces: 0,
    totalMembers: 0,
    createdAt: "",
  })

  const { user, currentWorkspace } = useWorkspace()

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: "",
      description: "",
      website: "",
    },
  })

  const loadOrganizationData = useCallback(async () => {
    if (!currentWorkspace) return

    try {
      setLoading(true)

      // D'abord récupérer les données du workspace pour avoir l'organization_id
      const workspaceResponse = await fetch(
        `/api/workspaces/${currentWorkspace}`
      )
      if (!workspaceResponse.ok) {
        setLoading(false)
        return
      }

      const workspaceData = await workspaceResponse.json()
      const organizationId = workspaceData.workspace?.organization_id

      if (!organizationId) {
        setLoading(false)
        return
      }

      // Charger les détails de l'organisation
      const orgResponse = await fetch(`/api/organizations/${organizationId}`)
      if (orgResponse.ok) {
        const orgData = await orgResponse.json()
        setOrganization(orgData.organization)

        form.reset({
          name: orgData.organization.name,
          description: orgData.organization.description || "",
          website: orgData.organization.website || "",
        })
      }

      // Charger les statistiques
      const statsResponse = await fetch(
        `/api/organizations/${organizationId}/stats`
      )
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error("Failed to load organization data:", error)
      toast.error("Failed to load organization data")
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace, form])

  useEffect(() => {
    if (currentWorkspace) {
      loadOrganizationData()
    }
  }, [currentWorkspace, loadOrganizationData])

  const onSubmit = async (data: OrganizationFormData) => {
    if (!organization) return

    try {
      setSaving(true)

      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success("Organization updated successfully")
        loadOrganizationData() // Recharger les données
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to update organization")
      }
    } catch (error) {
      console.error("Error updating organization:", error)
      toast.error("Failed to update organization")
    } finally {
      setSaving(false)
    }
  }

  const canManageOrganization = user?.role === "owner"

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">
            Loading organization settings...
          </div>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="mx-auto size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Organization not found</h3>
              <p className="text-muted-foreground">
                Unable to load organization settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="size-8" />
            Organization Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization details and preferences
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Building2 className="size-4" />
          {organization.name}
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Settings Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                Update your organization information and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Corporation"
                            {...field}
                            disabled={!canManageOrganization}
                          />
                        </FormControl>
                        <FormDescription>
                          This is the display name for your organization
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief description of your organization..."
                            className="resize-none"
                            rows={3}
                            {...field}
                            disabled={!canManageOrganization}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional description visible to all members
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com"
                            type="url"
                            {...field}
                            disabled={!canManageOrganization}
                          />
                        </FormControl>
                        <FormDescription>
                          Your organization&apos;s website URL
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {canManageOrganization && (
                    <div className="flex justify-end">
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <>
                            <Save className="mr-2 size-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 size-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Danger Zone - Only for owners */}
          {canManageOrganization && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border border-destructive/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-destructive">
                          Delete Organization
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete this organization and all
                          associated data
                        </p>
                      </div>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Statistics Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" />
                Organization Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Workspaces</span>
                <Badge variant="secondary">{stats.totalWorkspaces}</Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Members</span>
                <Badge variant="secondary">{stats.totalMembers}</Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="size-4" />
                  Created
                </span>
                <span className="text-sm text-muted-foreground">
                  {new Date(organization.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/dashboard/members">
                  <Users className="mr-2 size-4" />
                  Manage Members
                </Link>
              </Button>

              {canManageOrganization && (
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="mr-2 size-4" />
                  Create Workspace
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
