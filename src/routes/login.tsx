import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { SiteHeader } from "@/components/site-header"
import { SignInButton } from "@/components/sign-in-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.session) {
      throw redirect({ to: search.redirect ?? "/app" })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch()

  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md px-4 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>登录订阅计算器</CardTitle>
            <CardDescription>
              目前只提供 GitHub 登录，不支持邮箱密码。授权回调地址为{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                /api/auth/callback/github
              </code>
              。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignInButton callbackURL={redirectTo ?? "/app"} />
            <p className="text-sm text-muted-foreground">
              还没准备好？先回{" "}
              <Link to="/" className="underline">
                首页
              </Link>{" "}
              看看产品说明。
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
