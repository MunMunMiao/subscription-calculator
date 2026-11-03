"use client"

import { LogInIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function SignInButton({
  callbackURL = "/app",
}: {
  callbackURL?: string
}) {
  return (
    <Button
      onClick={() =>
        authClient.signIn.social({
          provider: "github",
          callbackURL,
        })
      }
    >
      <LogInIcon data-icon="inline-start" />
      使用 GitHub 登录
    </Button>
  )
}
