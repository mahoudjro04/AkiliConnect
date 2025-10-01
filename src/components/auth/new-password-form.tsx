"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/supabase/client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import type { LocaleType, NewPasswordFormType } from "@/types"

import { NewPasswordSchema } from "@/schemas/new-passward-schema"

import { ensureLocalizedPathname } from "@/lib/i18n"
import { ensureRedirectPathname } from "@/lib/utils"

import { toast } from "@/hooks/use-toast"
import { ButtonLoading } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

export function NewPasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  // Gérer la session de récupération Supabase (reset password)
  useEffect(() => {
    async function handleRecovery() {
      const accessToken = searchParams.get("access_token")
      const refreshToken = searchParams.get("refresh_token")
      const type = searchParams.get("type")

      if (type === "recovery" && accessToken && refreshToken) {
        // Authentifie la session avec les tokens de l'URL
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          console.error("Error setting session:", error)
          router.replace(params.lang ? `/${params.lang}/sign-in` : "/sign-in")
        }
        return
      }

      // Si ce n'est pas un recovery, vérifier si l'utilisateur est authentifié
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace(params.lang ? `/${params.lang}/sign-in` : "/sign-in")
      }
    }
    handleRecovery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const form = useForm<NewPasswordFormType>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const locale = params.lang as LocaleType
  const redirectPathname = searchParams.get("redirectTo")

  const { isSubmitting, isDirty } = form.formState
  const isDisabled = isSubmitting || !isDirty // Disable button if form is unchanged or submitting

  async function onSubmit(data: NewPasswordFormType) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })
      if (error) throw new Error(error.message)
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      })
      // Redirige vers sign-in après succès (optionnel, ou dashboard)
      router.push(ensureLocalizedPathname("/sign-in", locale))
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid gap-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <ButtonLoading isLoading={isSubmitting} disabled={isDisabled}>
          Set new password
        </ButtonLoading>
        <Link
          href={ensureLocalizedPathname(
            // Include redirect pathname if available, otherwise default to "/sign-in"
            redirectPathname
              ? ensureRedirectPathname("/sign-in", redirectPathname)
              : "/sign-in",
            locale
          )}
          className="-mt-4 text-center text-sm underline"
        >
          Back to Sign in
        </Link>
      </form>
    </Form>
  )
}
