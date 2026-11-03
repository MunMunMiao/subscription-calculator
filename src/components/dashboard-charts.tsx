"use client"

import { Cell, Pie, PieChart, Bar, BarChart, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { categoryLabel } from "@/lib/catalog"
import { formatMoney } from "@/lib/money"
import type { CategorySlice, Currency, SpendItem } from "@/lib/spend"
import { categoryBreakdown, sixMonthForecast } from "@/lib/spend"

const pieColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function DashboardCharts({
  items,
  currency,
}: {
  items: SpendItem[]
  currency: Currency
}) {
  const slices = categoryBreakdown(items, currency)
  const forecast = sixMonthForecast(items, currency)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CategoryPie slices={slices} currency={currency} />
      <ForecastBars forecast={forecast} currency={currency} />
    </div>
  )
}

function CategoryPie({
  slices,
  currency,
}: {
  slices: CategorySlice[]
  currency: Currency
}) {
  const config = Object.fromEntries(
    slices.map((slice, index) => [
      slice.category,
      {
        label: categoryLabel(slice.category),
        color: pieColors[index % pieColors.length],
      },
    ])
  ) satisfies ChartConfig

  const data = slices.map((slice) => ({
    ...slice,
    fill: `var(--color-${slice.category})`,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>分类占比</CardTitle>
        <CardDescription>
          {currency} 每月经常性支出（含本月一次性费用）
        </CardDescription>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            暂无可以绘图的支出
          </p>
        ) : (
          <ChartContainer config={config} className="mx-auto aspect-square max-h-72">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      formatMoney(Number(value ?? 0), currency)
                    }
                  />
                }
              />
              <Pie data={data} dataKey="amountCents" nameKey="category">
                {data.map((entry) => (
                  <Cell key={entry.category} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function ForecastBars({
  forecast,
  currency,
}: {
  forecast: Array<{ month: string; amountCents: number }>
  currency: Currency
}) {
  const config = {
    amountCents: {
      label: "预计扣费",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>未来 6 个月</CardTitle>
        <CardDescription>按扣费日汇总的 {currency} 预计支出</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-72 w-full">
          <BarChart data={forecast}>
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                formatMoney(Number(value), currency).replace(/[^\d.,]/g, "")
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    formatMoney(Number(value ?? 0), currency)
                  }
                />
              }
            />
            <Bar dataKey="amountCents" fill="var(--color-amountCents)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
