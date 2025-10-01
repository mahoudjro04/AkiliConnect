"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/supabase/client"

import type { UserType } from "../../types"

import { AccountRecoveryOptions } from "./_components/account-recovery-options"
import { ChangePassword } from "./_components/change-password"
import { RecentLogs } from "./_components/recent-logs"
import { SecurityPreferences } from "./_components/security-preferences"

export default function SecurityPage() {
  const [userInfo, setUserInfo] = useState<UserType | null>(null)
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        const metadata = data.user.user_metadata || {}
        setUserInfo({
          id: data.user.id,
          email: data.user.email,
          firstName: metadata.first_name || metadata.firstName || null,
          lastName: metadata.last_name || metadata.lastName || null,
          name:
            metadata.name ||
            metadata.full_name ||
            `${metadata.first_name || ""} ${metadata.last_name || ""}`.trim() ||
            metadata.username ||
            data.user.email?.split("@")[0] ||
            "User",
          username: metadata.username || null,
          avatar: metadata.avatar || metadata.picture || null,
          phoneNumber: metadata.phone_number || metadata.phoneNumber || null,
          role: metadata.role || null,
        })
      }
    }
    fetchUser()
  }, [])

  if (!userInfo) return null

  return (
    <div className="grid gap-4">
      <ChangePassword />
      <SecurityPreferences user={userInfo} />
      <AccountRecoveryOptions user={userInfo} />
      <RecentLogs />
    </div>
  )
}
