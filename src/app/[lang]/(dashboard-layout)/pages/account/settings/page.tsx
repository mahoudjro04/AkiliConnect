"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/supabase/client"

import type { UserType } from "../types"

import { DangerousZone } from "./_components/general/dangerous-zone"
import { ProfileInfo } from "./_components/general/profile-info"

export default function ProfileInfoPage() {
  const [userInfo, setUserInfo] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)

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
          ...metadata,
        })
      }
      setLoading(false)
    }
    fetchUser()
  }, [])

  if (loading) return <div>Loading...</div>
  if (!userInfo) return <div>No user info found.</div>

  return (
    <div className="grid gap-4">
      <ProfileInfo user={userInfo} />
      <DangerousZone user={userInfo} />
    </div>
  )
}
