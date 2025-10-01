import type { NavigationType } from "@/types"

export const navigationsData: NavigationType[] = [
  {
    title: "Pages",
    items: [
      {
        title: "Settings",
        href: "/pages/account/settings",
        iconName: "UserCog",
      },
      /* {
        title: "Profile",
        href: "/pages/account/profile",
        iconName: "User",
      }, */
      {
        title: "Fallback",
        iconName: "Replace",
        items: [
          {
            title: "Coming Soon",
            href: "/pages/coming-soon",
          },
          {
            title: "Not Found 404",
            href: "/pages/not-found-404",
          },
          {
            title: "Unauthorized 401",
            href: "/pages/unauthorized-401",
          },
          {
            title: "Maintenance",
            href: "/pages/maintenance",
          },
        ],
      },
      {
        title: "Authentication",
        iconName: "LogIn",
        items: [
          {
            title: "Forgot Password",
            href: "/forgot-password",
          },
          {
            title: "New Password",
            href: "/new-password",
          },
          {
            title: "Verify Email",
            href: "/verify-email",
          },
          {
            title: "Register",
            href: "/register",
          },
          {
            title: "Sign In",
            href: "/sign-in",
          },
        ],
      },
    ],
  },
]
