"use client"

import { useCallback, useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Briefcase, Building2, Plus } from "lucide-react"

import type { Workspace } from "@/types/multi-tenant"

import { useAuth, useWorkspace } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters"),
  description: z.string().optional(),
  type: z.enum(["project", "team", "personal"], {
    required_error: "Please select a workspace type",
  }),
})

type CreateWorkspaceData = z.infer<typeof createWorkspaceSchema>

interface CreateWorkspaceModalProps {
  trigger?: React.ReactNode
  onWorkspaceCreated?: (workspace: Workspace) => void
}

export function CreateWorkspaceModal({
  trigger,
  onWorkspaceCreated,
}: CreateWorkspaceModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { currentWorkspace, refreshContext } = useWorkspace()

  // Générer un nom suggéré basé sur l'utilisateur
  const generateSuggestedName = useCallback(() => {
    if (!user) return ""

    const userMetadata = user.user_metadata
    const firstName = userMetadata?.first_name || userMetadata?.firstName
    if (firstName) {
      return `${firstName}'s Workspace`
    }

    const emailName = user.email?.split("@")[0] || "My"
    return `${emailName}'s Workspace`
  }, [user])

  const form = useForm<CreateWorkspaceData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: generateSuggestedName(),
      description: "",
      type: "project",
    },
  })

  // Mettre à jour le nom suggéré quand le modal s'ouvre
  useEffect(() => {
    if (open && user) {
      const suggestedName = generateSuggestedName()
      if (suggestedName && !form.getValues("name")) {
        form.setValue("name", suggestedName)
      }
    }
  }, [open, user, form, generateSuggestedName])

  const onSubmit = async (data: CreateWorkspaceData) => {
    try {
      setLoading(true)

      // Récupérer l'organizationId du workspace actuel
      let organizationId = null
      if (currentWorkspace) {
        // Faire un appel pour récupérer les détails du workspace actuel
        const workspaceResponse = await fetch(
          `/api/workspaces/${currentWorkspace}`
        )
        if (workspaceResponse.ok) {
          const workspaceData = await workspaceResponse.json()
          organizationId = workspaceData.workspace.organization_id
        }
      }

      if (!organizationId) {
        toast.error(
          "No organization found. Please make sure you're in a valid workspace."
        )
        return
      }

      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          organizationId,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Workspace "${data.name}" created successfully`)

        form.reset()
        setOpen(false)

        // Refresh workspaces list
        if (refreshContext) {
          await refreshContext()
        }

        // Call callback if provided
        onWorkspaceCreated?.(result.workspace)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to create workspace")
      }
    } catch (error) {
      console.error("Error creating workspace:", error)
      toast.error("Failed to create workspace")
    } finally {
      setLoading(false)
    }
  }

  const workspaceTypes = [
    {
      value: "project",
      label: "Project",
      description: "For managing specific projects and deliverables",
      icon: Briefcase,
    },
    {
      value: "team",
      label: "Team",
      description: "For team collaboration and ongoing work",
      icon: Building2,
    },
    {
      value: "personal",
      label: "Personal",
      description: "For individual work and personal organization",
      icon: Plus,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 size-4" />
            New Workspace
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Create New Workspace
          </DialogTitle>
          <DialogDescription>
            Set up a new workspace for your team or project. You can always
            change these settings later.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Project" {...field} />
                  </FormControl>
                  <FormDescription>
                    Choose a descriptive name for your workspace
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select workspace type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workspaceTypes.map((type) => {
                        const Icon = type.icon
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="size-4" />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {type.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {type.description}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of what this workspace is for..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Help team members understand the workspace purpose
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// Variante avec bouton simple
export function CreateWorkspaceButton() {
  return (
    <CreateWorkspaceModal
      trigger={
        <Button size="sm">
          <Plus className="mr-2 size-4" />
          New Workspace
        </Button>
      }
    />
  )
}
