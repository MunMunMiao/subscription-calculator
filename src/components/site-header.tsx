"use client"

import { Link, useNavigate } from "@tanstack/react-router"
import { LogOutIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { SignInButton } from "@/components/sign-in-button"
import { authClient } from "@/lib/auth-client"

type HeaderUser = {
  name: string
  email: string
  image?: string | null
}

export function SiteHeader({ user }: { user?: HeaderUser | null }) {
  const navigate = useNavigate()

  async function signOut() {
    await authClient.signOut()
    await navigate({ to: "/" })
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-medium">
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">
            订
          </span>
          <span>订阅计算器</span>
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
          {user ? (
            <>
              <Link to="/app" className="hover:text-foreground">
                总览
              </Link>
              <Link to="/subscriptions" className="hover:text-foreground">
                订阅
              </Link>
            </>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <div className="hidden text-right text-xs sm:block">
                <div className="text-foreground">{user.name}</div>
                <div className="text-muted-foreground">{user.email}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void signOut()}
              >
                <LogOutIcon data-icon="inline-start" />
                退出
              </Button>
            </>
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </header>
  )
}
