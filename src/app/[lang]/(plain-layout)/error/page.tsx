import Link from "next/link"

import type { LocaleType } from "@/types"
import type { Metadata } from "next"

import { ensureLocalizedPathname } from "@/lib/i18n"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Define metadata for the page
export const metadata: Metadata = {
  title: "Authentication Error",
  description: "An error occurred during authentication",
}

export default async function AuthErrorPage(props: {
  params: Promise<{ lang: LocaleType }>
}) {
  const params = await props.params

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-destructive">
            Authentication Error
          </CardTitle>
          <CardDescription>
            There was a problem with your authentication request. The link may
            be expired or invalid.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href={ensureLocalizedPathname("/sign-in", params.lang)}>
                Back to Sign In
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link
                href={ensureLocalizedPathname("/forgot-password", params.lang)}
              >
                Request New Reset Link
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
