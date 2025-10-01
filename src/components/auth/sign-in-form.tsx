"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/supabase/client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import type { LocaleType, SignInFormType } from "@/types"

import { SignInSchema } from "@/schemas/sign-in-schema"

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
import { SeparatorWithText } from "@/components/ui/separator"
import { OAuthLinks } from "./oauth-links"

export function SignInForm() {
  const supabase = createClient()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const redirectPathname =
    searchParams.get("redirectTo") ||
    process.env.NEXT_PUBLIC_HOME_PATHNAME ||
    "/"

  const form = useForm<SignInFormType>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const locale = params.lang as LocaleType
  const { isSubmitting } = form.formState
  const isDisabled = isSubmitting // Disable button if form is submitting

  async function onSubmit(data: SignInFormType) {
    const { email, password } = data
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw new Error(error.message)
      router.push(redirectPathname)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid grow gap-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Your password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Link
              href={ensureLocalizedPathname(
                redirectPathname
                  ? ensureRedirectPathname("/forgot-password", redirectPathname)
                  : "/forgot-password",
                locale
              )}
              className="ms-auto inline-block text-sm underline"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <ButtonLoading isLoading={isSubmitting} disabled={isDisabled}>
          Sign In with Email
        </ButtonLoading>
        <SeparatorWithText>or continue with</SeparatorWithText>
        <OAuthLinks />
        <div className="-mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href={ensureLocalizedPathname(
              redirectPathname
                ? ensureRedirectPathname("/register", redirectPathname)
                : "/register",
              locale
            )}
            className="underline"
          >
            Sign up
          </Link>
        </div>
      </form>
    </Form>
  )
}
// ...existing code...
