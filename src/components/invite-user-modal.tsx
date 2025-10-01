"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Mail, Plus, UserPlus } from "lucide-react"

import { useWorkspace } from "@/hooks/use-auth"
import { useInvitations } from "@/hooks/use-invitations"
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

const inviteFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "member"], {
    required_error: "Please select a role",
  }),
  message: z.string().optional(),
})

type InviteFormData = z.infer<typeof inviteFormSchema>

interface InviteUserModalProps {
  trigger?: React.ReactNode
  onInviteSent?: () => void
}

export function InviteUserModal({
  trigger,
  onInviteSent,
}: InviteUserModalProps) {
  const [open, setOpen] = useState(false)
  const { sendInvitation, loading } = useInvitations()
  const { currentWorkspace } = useWorkspace()

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "member",
      message: "",
    },
  })

  const onSubmit = async (data: InviteFormData) => {
    if (!currentWorkspace) {
      toast.error("No workspace selected")
      return
    }

    const success = await sendInvitation(currentWorkspace, {
      email: data.email,
      role: data.role,
      message: data.message,
    })

    if (success) {
      toast.success(`Invitation sent to ${data.email}`)
      form.reset()
      setOpen(false)
      onInviteSent?.()
    } else {
      toast.error("Failed to send invitation")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="mr-2 size-4" />
            Invite Member
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your workspace. They&apos;ll receive an
            email with instructions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="colleague@company.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">
                        <div className="flex flex-col">
                          <span className="font-medium">Member</span>
                          <span className="text-xs text-muted-foreground">
                            Can view and use resources
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex flex-col">
                          <span className="font-medium">Admin</span>
                          <span className="text-xs text-muted-foreground">
                            Can manage resources and invite users
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hi! I'd like to invite you to join our workspace..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
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
                {loading ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// Variante plus simple pour un bouton rapide
export function QuickInviteButton() {
  return (
    <InviteUserModal
      trigger={
        <Button size="sm" variant="outline">
          <Plus className="mr-2 size-4" />
          Invite
        </Button>
      }
    />
  )
}
