import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { DashboardCharts } from "@/components/dashboard-charts"
import { EmptySubscriptions } from "@/components/empty-subscriptions"
import { UpcomingTimeline } from "@/components/upcoming-timeline"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Currency } from "@/lib/catalog"
import { formatMoney } from "@/lib/money"
import {
  totalsByCurrency,
  upcomingCharges,
  usedCurrencies,
  type SpendItem,
} from "@/lib/spend"
import { orpc } from "@/orpc/client"

export const Route = createFileRoute("/_protected/app")({
  component: DashboardPage,
})

const EMPTY_SPEND_ITEMS: SpendItem[] = []

function DashboardPage() {
  const navigate = useNavigate()
  const listQuery = useQuery(orpc.subscriptions.list.queryOptions())
  const items = (listQuery.data ?? EMPTY_SPEND_ITEMS) as SpendItem[]
  const currencies = usedCurrencies(items)
  const [currency, setCurrency] = useState<Currency>(currencies[0] ?? "USD")
  const [now] = useState(() => new Date())
  const activeCurrency = currencies.includes(currency)
    ? currency
    : (currencies[0] ?? "USD")
  const totals = useMemo(() => totalsByCurrency(items), [items])
  const selectedTotals = totals.find((item) => item.currency === activeCurrency)
  const charges = useMemo(() => upcomingCharges(items, now, 90), [items, now])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium">支出总览</h1>
          <p className="text-sm text-muted-foreground">
            经常性订阅按月/年折算；一次性费用计入发生月份和年份。货币不自动换汇。
          </p>
        </div>
        <Button render={<Link to="/subscriptions" />}>管理订阅</Button>
      </div>

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">正在读取订阅…</p>
      ) : items.length === 0 ? (
        <EmptySubscriptions
          onCreate={() => {
            void navigate({ to: "/subscriptions" })
          }}
          onSeed={() => {
            void navigate({ to: "/subscriptions", search: { seed: "1" } })
          }}
        />
      ) : (
        <>
          {currencies.length > 1 ? (
            <Tabs
              value={activeCurrency}
              onValueChange={(value) => {
                if (value === "USD" || value === "CNY") setCurrency(value)
              }}
            >
              <TabsList>
                {currencies.map((item) => (
                  <TabsTrigger key={item} value={item}>
                    {item}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="每月经常性"
              value={formatMoney(
                selectedTotals?.monthlyRecurring ?? 0,
                activeCurrency
              )}
              hint="生效中的周期性订阅折算到每月"
            />
            <StatCard
              title="每年经常性"
              value={formatMoney(
                selectedTotals?.yearlyRecurring ?? 0,
                activeCurrency
              )}
              hint="月经常性 × 12"
            />
            <StatCard
              title="本月一次性"
              value={formatMoney(
                selectedTotals?.oneTimeThisMonth ?? 0,
                activeCurrency
              )}
              hint="购买日落在本月的一次性费用"
            />
            <StatCard
              title="本年一次性"
              value={formatMoney(
                selectedTotals?.oneTimeThisYear ?? 0,
                activeCurrency
              )}
              hint="购买日落在今年的一次性费用"
            />
          </div>

          <DashboardCharts items={items} currency={activeCurrency} />
          <UpcomingTimeline charges={charges} />
        </>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {hint}
      </CardContent>
    </Card>
  )
}
