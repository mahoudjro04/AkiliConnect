import { redirect } from "next/navigation"

export default function Home() {
  redirect("/en/sign-in")
  return null
}
