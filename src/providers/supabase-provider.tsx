"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/supabase/client"

import type { Session } from "@supabase/supabase-js"
import type { ReactNode } from "react"

interface SupabaseContextType {
  session: Session | null
  loading: boolean
}

const SupabaseContext = createContext<SupabaseContextType>({
  session: null,
  loading: true,
})

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      }
    )
    // Initial session fetch
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <SupabaseContext.Provider value={{ session, loading }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabaseSession() {
  return useContext(SupabaseContext)
}
