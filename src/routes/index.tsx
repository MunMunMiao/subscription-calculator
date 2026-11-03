import { Link, createFileRoute } from "@tanstack/react-router"
import { CalendarDaysIcon, PieChartIcon, ShieldCheckIcon } from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { SignInButton } from "@/components/sign-in-button"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  const { session } = Route.useRouteContext()

  return (
    <div className="min-h-svh">
      <SiteHeader user={session?.user} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12">
        <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Subscription Calculator
            </p>
            <h1 className="max-w-2xl text-4xl font-medium tracking-tight">
              看清每一笔订阅，按月、按年、按分类。
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              记录周期性订阅和一次性费用，自动换算月/年支出，并用图表展示分类占比与即将扣费日期。登录后数据只属于你自己。
            </p>
            <div className="flex flex-wrap gap-3">
              {session ? (
                <Button render={<Link to="/app" />}>进入总览</Button>
              ) : (
                <SignInButton />
              )}
              {session ? (
                <Button variant="outline" render={<Link to="/subscriptions" />}>
                  管理订阅
                </Button>
              ) : (
                <Button variant="outline" render={<Link to="/login" />}>
                  了解登录方式
                </Button>
              )}
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>你会看到什么</CardTitle>
              <CardDescription>
                用真实订阅数据驱动总览，而不是静态截图。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>每月 / 每年经常性支出（USD 与 CNY 分开统计）</p>
              <p>按分类拆解，避免流媒体和云服务混在一起</p>
              <p>未来 90 天扣费时间线，以及 6 个月柱状预估</p>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <Feature
            icon={<ShieldCheckIcon />}
            title="GitHub 登录"
            body="只支持 GitHub OAuth。订阅行按 userId 隔离，不会看到别人的账单。"
          />
          <Feature
            icon={<CalendarDaysIcon />}
            title="周期 + 一次性"
            body="月付、年付、自定义天数，或域名/设备这种一次性费用，都能放在同一张表里。"
          />
          <Feature
            icon={<PieChartIcon />}
            title="可视化总览"
            body="轻量图表展示分类占比和未来扣费，适合快速判断该不该砍掉某项订阅。"
          />
        </section>
      </main>
    </div>
  )
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 text-muted-foreground [&_svg]:size-5">{icon}</div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
    </Card>
  )
}
