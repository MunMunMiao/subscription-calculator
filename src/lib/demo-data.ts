import type { Currency, Interval, Status, SubscriptionType } from "./catalog"

export type DemoSubscription = {
  name: string
  amountCents: number
  currency: Currency
  category: string
  notes: string
  type: SubscriptionType
  interval: Interval | null
  intervalDays: number | null
  chargeDateOffsetDays: number
  status: Status
}

export const demoSubscriptions: DemoSubscription[] = [
  {
    name: "Netflix",
    amountCents: 1599,
    currency: "USD",
    category: "streaming",
    notes: "标准套餐，家庭共用",
    type: "recurring",
    interval: "monthly",
    intervalDays: null,
    chargeDateOffsetDays: 5,
    status: "active",
  },
  {
    name: "GitHub Copilot",
    amountCents: 1000,
    currency: "USD",
    category: "software",
    notes: "个人月付",
    type: "recurring",
    interval: "monthly",
    intervalDays: null,
    chargeDateOffsetDays: 12,
    status: "active",
  },
  {
    name: "iCloud+",
    amountCents: 2100,
    currency: "CNY",
    category: "cloud",
    notes: "200GB 存储",
    type: "recurring",
    interval: "monthly",
    intervalDays: null,
    chargeDateOffsetDays: 2,
    status: "active",
  },
  {
    name: "域名续费",
    amountCents: 1200,
    currency: "USD",
    category: "cloud",
    notes: "example.com 年付",
    type: "recurring",
    interval: "yearly",
    intervalDays: null,
    chargeDateOffsetDays: 40,
    status: "active",
  },
  {
    name: "健身房季卡入场",
    amountCents: 29900,
    currency: "CNY",
    category: "health",
    notes: "一次性开通费",
    type: "one_time",
    interval: null,
    intervalDays: null,
    chargeDateOffsetDays: -8,
    status: "active",
  },
]
